import {
  HttpException,
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  LoginDto,
  UserResponseDto,
  LoginResponseDto,
  SignupDto,
  VerifyOtpDto,
  SignupResponseDto,
  VerifyOtpResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  ForgetPasswordDto,
  ForgetPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ChangePhoneNumberRequestDto,
  ChangePhoneNumberVerifyDto,
  ChangePhoneNumberRequestResponseDto,
  ChangePhoneNumberVerifyResponseDto,
} from './dto';
import { DatabaseService } from '../../../common/database/database.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import {
  TokenClaim,
  ILogin,
} from '../../../common/interfaces/login.interface';
import { AuthorizationService } from '../../../common/services/authorization.service';
import { RefreshTokenService } from '../../../common/services/refresh-token.service';
import { OtpService } from '../../../common/services/otp.service';
import { PasswordService } from '../../../common/services/password.service';
import { RateLimitService } from '../../../common/services/rate-limit.service';
import { AuthAuditService } from '../../../common/services/auth-audit.service';
import { SmsService } from '../../../common/services/sms.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { plainToInstance } from 'class-transformer';
import { normalizeEthiopianPhoneNumber } from '../../../common/decorators/is-phone-number.decorator';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prisma: DatabaseService,
    private readonly authorizationService: AuthorizationService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly otpService: OtpService,
    private readonly passwordService: PasswordService,
    private readonly rateLimitService: RateLimitService,
    private readonly authAuditService: AuthAuditService,
    private readonly smsService: SmsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async login(
    loginDto: LoginDto,
    ip_address: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<LoginResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      loginDto.username,
      'login',
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.getLoginDetail(loginDto.username);

    if (!user) {
      await this.rateLimitService.recordAttempt(
        loginDto.username,
        'login',
        false,
        ip_address,
        userAgent,
        'User Not Found',
      );

      throw new HttpException(
        `Invalid credentials, ${rateLimit.remaining} remaining attempts`,
        401,
      );
    }

    if (!user.is_active) {
      throw new HttpException('User is inactive', 401);
    }

    if (user.is_suspended) {
      throw new HttpException('User is suspended', 401);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.rateLimitService.recordAttempt(
        loginDto.username,
        'login',
        false,
        ip_address,
        userAgent,
        'Invalid Password',
      );

      throw new HttpException(
        `Invalid credentials, ${rateLimit.remaining} remaining attempts`,
        401,
      );
    }

    if (loginDto.lat && loginDto.long) {
      await this.prisma.loginHistory.create({
        data: {
          user_id: user.id,
          ip_address,
          lat: loginDto.lat,
          lng: loginDto.long,
        },
      });
    }

    const result = await this.generateJwtToken(
      user,
      ip_address,
      userAgent,
      deviceFingerprint,
    );

    const userRoles = await this.authorizationService.getUserRoles(user.id);

    const userResponse = plainToInstance(UserResponseDto, {
      ...result.user,
      userRoles,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: userResponse,
    };
  }

  async me(token: TokenClaim): Promise<UserResponseDto> {
    const user = await this.getLoginDetail(token.user.username);
    const userRoles = await this.authorizationService.getUserRoles(
      token.user.sub,
    );

    return plainToInstance(UserResponseDto, {
      ...user,
      userRoles,
      server_time: new Date(),
    });
  }

  async refreshToken(
    payload: any,
    ip_address?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.getLoginDetailById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const rotationResult = await this.refreshTokenService.rotateRefreshToken(
      payload.jti,
      ip_address,
      userAgent,
      deviceFingerprint,
    );

    const userRoles = await this.authorizationService.getUserRoles(user.id);

    const userResponse = plainToInstance(UserResponseDto, {
      ...user,
      userRoles,
    });

    return {
      accessToken: rotationResult.newAccessToken,
      refreshToken: rotationResult.newRefreshToken,
      user: userResponse,
    };
  }

  async logout(
    userId: string,
    jti?: string,
    reason: string = 'logout',
    accessTokenJti?: string,
    accessTokenExpiresAt?: Date,
  ): Promise<void> {
    if (jti && accessTokenJti && accessTokenExpiresAt) {
      await this.refreshTokenService.revokeCurrentUserSession(
        userId,
        'user',
        accessTokenJti,
        accessTokenExpiresAt,
        reason,
      );
    } else {
      await this.refreshTokenService.revokeAllUserTokens(
        userId,
        'user',
        reason,
      );
    }
  }

  async logoutAll(
    userId: string,
    reason: string = 'logout_all',
  ): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId, 'user', reason);
  }

  async getLoginDetail(username: string) {
    return await this.prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        password: true,
        email: true,
        phone_number: true,
        require_password_change: true,
        is_active: true,
        is_suspended: true,
        id_type: true,
        username_verified: true,
      },
    });
  }

  async getLoginDetailById(userId: string) {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        password: true,
        email: true,
        phone_number: true,
        require_password_change: true,
        is_active: true,
        is_suspended: true,
        username_verified: true,
      },
    });
  }

  private async generateJwtToken<T extends ILogin | Partial<ILogin>>(
    user: T,
    ip_address?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: T;
  }> {
    const accessTokenJti = `${user.id}-${Date.now()}`;
    const accessToken = this.jwtService.sign(
      {
        sub: user.id || '',
        username: user.username || '',
        username_verified: user.username_verified || false,
        language: 'en',
        jti: accessTokenJti,
        type: 'access',
      },
      {
        algorithm: 'HS256',
        expiresIn: '15m',
        issuer: process.env.JWT_ISSUER || 'pmis-backend',
        audience: process.env.JWT_AUDIENCE || 'pmis-users',
      },
    );

    const { refreshToken } = await this.refreshTokenService.createRefreshToken(
      user.id || '',
      'user',
      user.username || '',
      ip_address,
      userAgent,
      deviceFingerprint,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async signup(
    signupDto: SignupDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<SignupResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      ipAddress,
      'signup',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const passwordValidation = this.passwordService.validatePassword(
      signupDto.password,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: signupDto.username },
          { phone_number: signupDto.phone_number },
          ...(signupDto.email ? [{ email: signupDto.email }] : []),
        ],
      },
    });

    if (existingUser) {
      await this.rateLimitService.recordAttempt(
        ipAddress,
        'signup',
        false,
        ipAddress,
        userAgent,
        'User already exists',
      );

      throw new ConflictException('Registration failed. Please try again.');
    }

    const hashedPassword = await this.passwordService.hashPassword(
      signupDto.password,
    );

    const user = await this.prisma.user.create({
      data: {
        user_type: 'INDIVIDUAL',
        id_type: 'GOVERNMENT_ID',
        name: signupDto.name,
        username: signupDto.username,
        password: hashedPassword,
        phone_number: signupDto.phone_number,
        email: signupDto.email || null,
        username_verified: false,
        is_active: true,
      },
    });

    await this.otpService.generateOtp(
      user.id,
      'verification',
      'user',
      signupDto.phone_number,
    );

    await this.rateLimitService.recordAttempt(
      ipAddress,
      'signup',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logSignup(
      user.id,
      signupDto.username,
      'success',
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpGenerated(
      user.id,
      'verification',
      ipAddress,
      userAgent,
    );

    return {
      message:
        'User registered successfully. Please verify your account with the OTP sent to your phone.',
    };
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<VerifyOtpResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      verifyOtpDto.usernameOrPhone,
      'otp_verify',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: verifyOtpDto.usernameOrPhone },
          { phone_number: verifyOtpDto.usernameOrPhone },
        ],
      },
    });

    if (!user) {
      await this.rateLimitService.recordAttempt(
        verifyOtpDto.usernameOrPhone,
        'otp_verify',
        false,
        ipAddress,
        userAgent,
        'User not found',
      );

      throw new BadRequestException('Invalid credentials');
    }

    const otpValidation = await this.otpService.validateOtp(
      user.id,
      verifyOtpDto.otp,
      'verification',
    );

    if (!otpValidation.isValid) {
      await this.rateLimitService.recordAttempt(
        verifyOtpDto.usernameOrPhone,
        'otp_verify',
        false,
        ipAddress,
        userAgent,
        otpValidation.reason,
      );

      await this.authAuditService.logOtpVerification(
        user.id,
        'failure',
        ipAddress,
        userAgent,
        otpValidation.reason,
        otpValidation.remainingAttempts,
      );

      if (otpValidation.isLocked) {
        throw new HttpException(
          'Too many failed attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        username_verified: true,
        username_verified_at: new Date(),
        is_active: true,
      },
    });

    await this.rateLimitService.recordAttempt(
      verifyOtpDto.usernameOrPhone,
      'otp_verify',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpVerification(
      user.id,
      'success',
      ipAddress,
      userAgent,
    );

    const loginResponse = await this.generateJwtToken(
      user,
      ipAddress,
      userAgent,
    );

    const userRoles = await this.authorizationService.getUserRoles(user.id);
    const userResponse = plainToInstance(UserResponseDto, {
      ...loginResponse.user,
      userRoles,
    });

    return {
      message: 'Account verified successfully',
      loginResponse: {
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        user: userResponse,
      },
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ChangePasswordResponseDto> {
    const user = await this.getLoginDetailById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordValidation = this.passwordService.validatePassword(
      changePasswordDto.newPassword,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        require_password_change: false,
        updated_at: new Date(),
      },
    });

    await this.authAuditService.logPasswordChange(
      userId,
      'success',
      ipAddress,
      userAgent,
    );

    try {
      const smsMessage = `Your password has been changed successfully. If you did not make this change, please contact support immediately.`;
      await this.smsService.sendSms(user.phone_number, smsMessage);
    } catch (error) {
      console.error('Failed to send password change SMS:', error);
    }

    try {
      await this.notificationsService.createForUser(
        userId,
        'PASSWORD_CHANGED',
        {
          title: 'Password Changed',
          body: 'Your password has been changed successfully. If you did not make this change, please contact support immediately.',
          priority: 'high',
          data: {
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent,
          },
        },
      );
    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }

    return {
      message: 'Password changed successfully',
    };
  }

  async forgetPassword(
    forgetPasswordDto: ForgetPasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ForgetPasswordResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      forgetPasswordDto.usernameOrPhone,
      'forget_password',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    let user = await this.prisma.user.findUnique({
      where: {
        username: forgetPasswordDto.usernameOrPhone,
      },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              phone_number: forgetPasswordDto.usernameOrPhone,
            },
            {
              phone_number: forgetPasswordDto.usernameOrPhone.replace('+', ''),
            },
          ],
        },
      });
    }

    if (!user) {
      await this.rateLimitService.recordAttempt(
        forgetPasswordDto.usernameOrPhone,
        'forget_password',
        false,
        ipAddress,
        userAgent,
        'User not found',
      );

      throw new BadRequestException('User Not Found');
    }

    if (!user.is_active) {
      throw new BadRequestException('Account is inactive');
    }

    if (user.is_suspended) {
      throw new BadRequestException('Account is suspended');
    }

    let normalizedPhoneNumber: string;
    try {
      normalizedPhoneNumber = normalizeEthiopianPhoneNumber(user.phone_number);
    } catch (error) {
      throw new BadRequestException(
        'Invalid phone number format in user record',
      );
    }

    await this.otpService.generateOtp(
      user.id,
      'password_reset',
      'user',
      normalizedPhoneNumber,
    );

    await this.rateLimitService.recordAttempt(
      forgetPasswordDto.usernameOrPhone,
      'forget_password',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpGenerated(
      user.id,
      'password_reset',
      ipAddress,
      userAgent,
    );

    return {
      message: 'Password reset OTP sent to your phone',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ResetPasswordResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      resetPasswordDto.usernameOrPhone,
      'reset_password',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    let user = await this.prisma.user.findUnique({
      where: {
        username: resetPasswordDto.usernameOrPhone,
      },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              phone_number: resetPasswordDto.usernameOrPhone,
            },
            {
              phone_number: resetPasswordDto.usernameOrPhone.replace('+', ''),
            },
          ],
        },
      });
    }

    if (!user) {
      await this.rateLimitService.recordAttempt(
        resetPasswordDto.usernameOrPhone,
        'reset_password',
        false,
        ipAddress,
        userAgent,
        'User not found',
      );

      throw new BadRequestException('Invalid credentials');
    }

    const otpValidation = await this.otpService.validateOtp(
      user.id,
      resetPasswordDto.otp,
      'password_reset',
    );

    if (!otpValidation.isValid) {
      await this.rateLimitService.recordAttempt(
        resetPasswordDto.usernameOrPhone,
        'reset_password',
        false,
        ipAddress,
        userAgent,
        otpValidation.reason,
      );

      await this.authAuditService.logOtpVerification(
        user.id,
        'failure',
        ipAddress,
        userAgent,
        otpValidation.reason,
        otpValidation.remainingAttempts,
      );

      if (otpValidation.isLocked) {
        throw new HttpException(
          'Too many failed attempts. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException('Invalid or expired OTP');
    }

    const passwordValidation = this.passwordService.validatePassword(
      resetPasswordDto.newPassword,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    const hashedNewPassword = await this.passwordService.hashPassword(
      resetPasswordDto.newPassword,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        require_password_change: false,
        updated_at: new Date(),
      },
    });

    await this.rateLimitService.recordAttempt(
      resetPasswordDto.usernameOrPhone,
      'reset_password',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpVerification(
      user.id,
      'success',
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logPasswordReset(
      user.id,
      'success',
      ipAddress,
      userAgent,
    );

    return {
      message: 'Password reset successfully',
    };
  }

  async requestChangePhoneNumber(
    userId: string,
    changePhoneNumberRequestDto: ChangePhoneNumberRequestDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ChangePhoneNumberRequestResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const existingUser = await this.prisma.user.findFirst({
        where: {
          phone_number: changePhoneNumberRequestDto.newPhoneNumber,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new BadRequestException('Phone number is already in use');
      }

      const otpResult = await this.otpService.generateOtp(
        userId,
        'change_phone_number',
        'user',
        changePhoneNumberRequestDto.newPhoneNumber,
      );

      await this.rateLimitService.recordAttempt(
        userId,
        'change_phone_number_request',
        true,
        ipAddress,
        userAgent,
        'Phone number change OTP requested',
      );

      return {
        message: 'OTP sent to new phone number',
        expiresAt: otpResult.expiresAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      await this.rateLimitService.recordAttempt(
        userId,
        'change_phone_number_request',
        false,
        ipAddress,
        userAgent,
        'Phone number change OTP request failed',
      );

      throw new BadRequestException('Failed to send OTP to new phone number');
    }
  }

  async verifyChangePhoneNumber(
    userId: string,
    changePhoneNumberVerifyDto: ChangePhoneNumberVerifyDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ChangePhoneNumberVerifyResponseDto> {
    try {
      const otpValidation = await this.otpService.validateOtp(
        userId,
        changePhoneNumberVerifyDto.otp,
        'change_phone_number',
      );

      if (!otpValidation.isValid) {
        await this.rateLimitService.recordAttempt(
          userId,
          'change_phone_number_verify',
          false,
          ipAddress,
          userAgent,
          `OTP validation failed: ${otpValidation.reason}`,
        );

        throw new BadRequestException(
          otpValidation.reason || 'Invalid or expired OTP',
        );
      }

      const otpRecord = await this.prisma.otp.findFirst({
        where: {
          user_id: userId,
          purpose: 'change_phone_number',
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!otpRecord) {
        throw new BadRequestException('OTP record not found or expired');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.phone_number === changePhoneNumberVerifyDto.newPhoneNumber) {
        throw new BadRequestException(
          'New phone number must be different from current phone number',
        );
      }

      const existingUser = await this.prisma.user.findFirst({
        where: {
          phone_number: changePhoneNumberVerifyDto.newPhoneNumber,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new BadRequestException(
          'Phone number is already in use by another user',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phone_number: changePhoneNumberVerifyDto.newPhoneNumber,
        },
      });

      await this.prisma.otp.delete({
        where: { id: otpRecord.id },
      });

      await this.rateLimitService.recordAttempt(
        userId,
        'change_phone_number_verify',
        true,
        ipAddress,
        userAgent,
        'Phone number changed successfully',
      );

      return {
        message: 'Phone number changed successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      await this.rateLimitService.recordAttempt(
        userId,
        'change_phone_number_verify',
        false,
        ipAddress,
        userAgent,
        'Phone number change verification failed',
      );

      throw new BadRequestException('Failed to change phone number');
    }
  }
}
