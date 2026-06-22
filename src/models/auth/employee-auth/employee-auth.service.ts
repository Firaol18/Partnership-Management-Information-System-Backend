import {
  HttpException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  EmployeeLoginDto,
  EmployeeLoginResponseDto,
  EmployeeChangePasswordDto,
  EmployeeChangePasswordResponseDto,
  EmployeeForgetPasswordDto,
  EmployeeForgetPasswordResponseDto,
  EmployeeResetPasswordDto,
  EmployeeResetPasswordResponseDto,
  EmployeeAuthResponseDto,
  EmployeeLoginHistorySearchDto,
} from './dto';
import { DatabaseService } from '../../../common/database/database.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import {
  EmployeeTokenClaim,
  IEmployeeLogin,
} from '../../../common/interfaces/employee-login.interface';
import { AuthorizationService } from '../../../common/services/authorization.service';
import { RefreshTokenService } from '../../../common/services/refresh-token.service';
import { OtpService } from '../../../common/services/otp.service';
import { PasswordService } from '../../../common/services/password.service';
import { RateLimitService } from '../../../common/services/rate-limit.service';
import { AuthAuditService } from '../../../common/services/auth-audit.service';
import { SmsService } from '../../../common/services/sms.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { paginate } from '../../../common/utils/paginater';

@Injectable()
export class EmployeeAuthService {
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
    loginDto: EmployeeLoginDto,
    ip_address: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<EmployeeLoginResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      loginDto.username,
      'login',
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user: any = await this.getEmployeeLoginDetail(loginDto.username);

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
      throw new HttpException(
        'User is inactive. Please contact your administrator.',
        401,
      );
    }

    if (user.is_suspended) {
      throw new HttpException(
        'User is suspended. Please contact your administrator.',
        401,
      );
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
        'Invalid credentials',
      );

      throw new HttpException(
        `Invalid credentials, ${rateLimit.remaining} remaining attempts`,
        401,
      );
    }

    await this.prisma.employeeLoginHistory.create({
      data: {
        employee_id: user.id,
        ip_address,
        lat: loginDto.lat || null,
        lng: loginDto.long || null,
      },
    });

    const result = await this.generateJwtToken(
      user,
      ip_address,
      userAgent,
      deviceFingerprint,
    );

    const resourcePermissions =
      await this.authorizationService.getEmployeePermissions(user.id);

    const userResponse = plainToInstance(EmployeeAuthResponseDto, {
      ...result.user,
      resourcePermissions,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: userResponse,
    };
  }

  async me(token: EmployeeTokenClaim): Promise<EmployeeAuthResponseDto> {
    const user = await this.getEmployeeLoginDetail(token.user.username);
    const userRoles = await this.authorizationService.getEmployeeRoles(
      token.user.sub,
    );
    const resourcePermissions =
      await this.authorizationService.getEmployeePermissions(token.user.sub);

    return plainToInstance(EmployeeAuthResponseDto, {
      ...user,
      userRoles,
      resourcePermissions,
      server_time: new Date(),
    });
  }

  async refreshToken(
    payload: any,
    ip_address?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<EmployeeLoginResponseDto> {
    const user = await this.getEmployeeLoginDetailById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const rotationResult = await this.refreshTokenService.rotateRefreshToken(
      payload.jti,
      ip_address,
      userAgent,
      deviceFingerprint,
    );

    const resourcePermissions =
      await this.authorizationService.getEmployeePermissions(user.id);

    const userResponse = plainToInstance(EmployeeAuthResponseDto, {
      ...user,
      resourcePermissions,
    });

    return {
      accessToken: rotationResult.newAccessToken,
      refreshToken: rotationResult.newRefreshToken,
      user: userResponse,
    };
  }

  async logout(
    employeeId: string,
    jti?: string,
    reason: string = 'logout',
    accessTokenJti?: string,
    accessTokenExpiresAt?: Date,
  ): Promise<void> {
    if (jti && accessTokenJti && accessTokenExpiresAt) {
      await this.refreshTokenService.revokeCurrentUserSession(
        employeeId,
        'employee',
        accessTokenJti,
        accessTokenExpiresAt,
        reason,
      );
    } else {
      await this.refreshTokenService.revokeAllUserTokens(
        employeeId,
        'employee',
        reason,
      );
    }
  }

  async logoutAll(
    employeeId: string,
    reason: string = 'logout_all',
  ): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(
      employeeId,
      'employee',
      reason,
    );
  }

  async getEmployeeLoginDetail(username: string) {
    return await this.prisma.employee.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        password: true,
        email: true,
        require_password_change: true,
        is_active: true,
        is_suspended: true,
        username_verified: true,
        group_id: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getEmployeeLoginDetailById(employeeId: string) {
    return await this.prisma.employee.findUnique({
      where: {
        id: employeeId,
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
        group_id: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private async generateJwtToken<
    T extends IEmployeeLogin | Partial<IEmployeeLogin>,
  >(
    user: T,
    ip_address?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: T;
  }> {
    const accessTokenJti = `emp-${user.id}-${Date.now()}`;
    const accessToken = this.jwtService.sign(
      {
        sub: user.id || '',
        username: user.username || '',
        group_id: user.group_id || '',
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
      'employee',
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

  async changePassword(
    employeeId: string,
    changePasswordDto: EmployeeChangePasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<EmployeeChangePasswordResponseDto> {
    const employee = await this.getEmployeeLoginDetailById(employeeId);
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      employee.password,
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
      employee.password,
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        password: hashedNewPassword,
        require_password_change: false,
        updated_at: new Date(),
      },
    });

    await this.authAuditService.logPasswordChange(
      employeeId,
      'success',
      ipAddress,
      userAgent,
    );

    try {
      const smsMessage = `Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.`;
      await this.smsService.sendSms(employee.phone_number, smsMessage);
    } catch (error) {
      console.error('Failed to send password change SMS:', error);
    }

    try {
      await this.notificationsService.createForEmployee(
        employeeId,
        'PASSWORD_CHANGED',
        {
          title: 'Password Changed',
          body: 'Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.',
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
    forgetPasswordDto: EmployeeForgetPasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<EmployeeForgetPasswordResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      forgetPasswordDto.username,
      'forget_password',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        username: forgetPasswordDto.username,
      },
    });

    if (!employee) {
      await this.rateLimitService.recordAttempt(
        forgetPasswordDto.username,
        'forget_password',
        false,
        ipAddress,
        userAgent,
        'Employee not found',
      );

      throw new BadRequestException(
        'If the account exists, a reset code has been sent',
      );
    }

    if (!employee.is_active) {
      throw new BadRequestException('Account is inactive');
    }

    if (employee.is_suspended) {
      throw new BadRequestException('Account is suspended');
    }

    await this.otpService.generateOtp(
      employee.id,
      'password_reset',
      'employee',
      employee.phone_number,
    );

    await this.rateLimitService.recordAttempt(
      forgetPasswordDto.username,
      'forget_password',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpGenerated(
      employee.id,
      'password_reset',
      ipAddress,
      userAgent,
    );

    return {
      message: 'Password reset OTP sent to your phone',
    };
  }

  async resetPassword(
    resetPasswordDto: EmployeeResetPasswordDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<EmployeeResetPasswordResponseDto> {
    const rateLimit = await this.rateLimitService.checkRateLimit(
      resetPasswordDto.username,
      'reset_password',
      ipAddress,
      userAgent,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(rateLimit.reason, HttpStatus.TOO_MANY_REQUESTS);
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        username: resetPasswordDto.username,
      },
    });

    if (!employee) {
      await this.rateLimitService.recordAttempt(
        resetPasswordDto.username,
        'reset_password',
        false,
        ipAddress,
        userAgent,
        'Employee not found',
      );

      throw new BadRequestException('Invalid credentials');
    }

    const otpValidation = await this.otpService.validateOtp(
      employee.id,
      resetPasswordDto.otp,
      'password_reset',
      'employee',
    );

    if (!otpValidation.isValid) {
      await this.rateLimitService.recordAttempt(
        resetPasswordDto.username,
        'reset_password',
        false,
        ipAddress,
        userAgent,
        otpValidation.reason,
      );

      await this.authAuditService.logOtpVerification(
        employee.id,
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

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        password: hashedNewPassword,
        require_password_change: false,
        updated_at: new Date(),
      },
    });

    await this.rateLimitService.recordAttempt(
      resetPasswordDto.username,
      'reset_password',
      true,
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logOtpVerification(
      employee.id,
      'success',
      ipAddress,
      userAgent,
    );

    await this.authAuditService.logPasswordReset(
      employee.id,
      'success',
      ipAddress,
      userAgent,
    );

    return {
      message: 'Password reset successfully',
    };
  }

  async loginHistory(data: EmployeeLoginHistorySearchDto) {
    const { employee_id, ip_address, date_from, date_to, search } = data;
    const where: Prisma.EmployeeLoginHistoryWhereInput = {};

    if (employee_id) {
      where.employee_id = employee_id;
    }

    if (ip_address) {
      where.ip_address = ip_address;
    }

    if (date_from) {
      where.created_at = { gte: date_from };
    }

    if (date_to) {
      where.created_at = { lte: date_to };
    }

    if (search) {
      where.employee = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { phone_number: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return await paginate(
      this.prisma.employeeLoginHistory,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      { page: data.page, perPage: data.limit },
    );
  }
}
