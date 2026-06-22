import {
  Controller,
  Get,
  Post,
  Body,
  SerializeOptions,
  HttpCode,
  HttpStatus,
  Ip,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../../common/decorators/public.decorator';
import { RefreshToken } from '../../../common/decorators/refresh-token.decorator';
import {
  LoginDto,
  LoginResponseDto,
  UserResponseDto,
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
import { TokenClaim } from '../../../common/interfaces/login.interface';
import { ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { RefreshTokenGuard } from '../../../common/guards/refresh-token.guard';
import { AuthGuard } from '../../../common/guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  @ApiHeader({
    name: 'x-device-fingerprint',
    description: 'Device fingerprint for additional security (optional)',
    required: false,
  })
  login(
    @Body() loginDto: LoginDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, ip, userAgent, deviceFingerprint);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @ApiResponse({
    status: 200,
    description: 'Get current user profile',
    type: UserResponseDto,
  })
  me(@Request() request: TokenClaim): Promise<UserResponseDto> {
    return this.authService.me(request);
  }

  @Public()
  @RefreshToken()
  @UseGuards(RefreshTokenGuard)
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  @ApiHeader({
    name: 'x-device-fingerprint',
    description: 'Device fingerprint for additional security (optional)',
    required: false,
  })
  public refresh(
    @Request() request: any,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ): Promise<LoginResponseDto> {
    const payload = request.refreshTokenPayload;
    return this.authService.refreshToken(
      payload,
      ip,
      userAgent,
      deviceFingerprint,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  public logout(@Request() request: any): Promise<void> {
    const userId = request.user?.sub;
    const jti = request.user?.jti;
    if (!userId) {
      throw new UnauthorizedException('Invalid token: User ID not found');
    }

    const exp = request.user?.exp;
    const accessTokenExpiresAt = exp
      ? new Date(exp * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);

    return this.authService.logout(
      userId,
      jti,
      'logout',
      jti,
      accessTokenExpiresAt,
    );
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Logout from all devices successful',
  })
  public logoutAll(@Request() request: TokenClaim): Promise<void> {
    return this.authService.logoutAll(request.user.sub);
  }

  // Flow A: Normal signup with OTP
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: SignupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or user already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  signup(
    @Body() signupDto: SignupDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto, ip, userAgent);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    type: VerifyOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many failed attempts',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto, ip, userAgent);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid current password or password validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() request: TokenClaim,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(
      request.user.sub,
      changePasswordDto,
      ip,
      userAgent,
    );
  }

  @Public()
  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP sent successfully',
    type: ForgetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid username',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  forgetPassword(
    @Body() forgetPasswordDto: ForgetPasswordDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ForgetPasswordResponseDto> {
    return this.authService.forgetPassword(forgetPasswordDto, ip, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid username, OTP or password validation failed',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many failed attempts',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(resetPasswordDto, ip, userAgent);
  }

  @Post('change-phone-number/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 202,
    description: 'OTP sent to new phone number successfully',
    type: ChangePhoneNumberRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number or phone number already in use',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  requestChangePhoneNumber(
    @Body() changePhoneNumberRequestDto: ChangePhoneNumberRequestDto,
    @Request() request: TokenClaim,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ChangePhoneNumberRequestResponseDto> {
    return this.authService.requestChangePhoneNumber(
      request.user.sub,
      changePhoneNumberRequestDto,
      ip,
      userAgent,
    );
  }

  @Post('change-phone-number/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Phone number changed successfully',
    type: ChangePhoneNumberVerifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many failed attempts',
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'Browser/device user agent (optional)',
    required: false,
  })
  verifyChangePhoneNumber(
    @Body() changePhoneNumberVerifyDto: ChangePhoneNumberVerifyDto,
    @Request() request: TokenClaim,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ChangePhoneNumberVerifyResponseDto> {
    return this.authService.verifyChangePhoneNumber(
      request.user.sub,
      changePhoneNumberVerifyDto,
      ip,
      userAgent,
    );
  }
}
