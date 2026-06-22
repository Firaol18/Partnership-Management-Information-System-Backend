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
  Query,
} from '@nestjs/common';
import { EmployeeAuthService } from './employee-auth.service';
import { Public } from '../../../common/decorators/public.decorator';
import { RefreshToken } from '../../../common/decorators/refresh-token.decorator';
import {
  EmployeeLoginDto,
  EmployeeAuthResponseDto,
  EmployeeLoginResponseDto,
  EmployeeChangePasswordDto,
  EmployeeChangePasswordResponseDto,
  EmployeeForgetPasswordDto,
  EmployeeForgetPasswordResponseDto,
  EmployeeResetPasswordDto,
  EmployeeResetPasswordResponseDto,
  EmployeeLoginHistorySearchDto,
} from './dto';
import { EmployeeTokenClaim } from '../../../common/interfaces/employee-login.interface';
import { ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { EmployeeRefreshTokenGuard } from '../../../common/guards/employee-refresh-token.guard';
import { EmployeeAuthGuard } from '../../../common/guards/employee-auth.guard';
import { Resource } from '../../../common/decorators/resource.decorator';
import { RESOURCE } from '../../../common/constants/resource';
import { ACTIONS } from '../../../common/constants/actions';

@Controller('employee-auth')
export class EmployeeAuthController {
  constructor(private readonly employeeAuthService: EmployeeAuthService) {}

  @Public()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Employee login successful',
    type: EmployeeLoginResponseDto,
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
  adminLogin(
    @Body() loginDto: EmployeeLoginDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ): Promise<EmployeeLoginResponseDto> {
    return this.employeeAuthService.login(
      loginDto,
      ip,
      userAgent,
      deviceFingerprint,
    );
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Get current employee profile',
    type: EmployeeAuthResponseDto,
  })
  me(@Request() request: EmployeeTokenClaim): Promise<EmployeeAuthResponseDto> {
    return this.employeeAuthService.me(request);
  }

  @Public()
  @RefreshToken()
  @UseGuards(EmployeeRefreshTokenGuard)
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Employee token refreshed successfully',
    type: EmployeeLoginResponseDto,
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
  ): Promise<EmployeeLoginResponseDto> {
    const payload = request.refreshTokenPayload;
    return this.employeeAuthService.refreshToken(
      payload,
      ip,
      userAgent,
      deviceFingerprint,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(EmployeeAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Employee logout successful',
  })
  public logout(@Request() request: any): Promise<void> {
    const employeeId = request.user?.sub;
    const jti = request.user?.jti;
    if (!employeeId) {
      throw new UnauthorizedException('Invalid token: Employee ID not found');
    }

    const exp = request.user?.exp;
    const accessTokenExpiresAt = exp
      ? new Date(exp * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);

    return this.employeeAuthService.logout(
      employeeId,
      jti,
      'logout',
      jti,
      accessTokenExpiresAt,
    );
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(EmployeeAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Employee logout from all devices successful',
  })
  public logoutAll(@Request() request: EmployeeTokenClaim): Promise<void> {
    return this.employeeAuthService.logoutAll(request.user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(EmployeeAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: EmployeeChangePasswordResponseDto,
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
    @Body() changePasswordDto: EmployeeChangePasswordDto,
    @Request() request: EmployeeTokenClaim,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<EmployeeChangePasswordResponseDto> {
    return this.employeeAuthService.changePassword(
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
    type: EmployeeForgetPasswordResponseDto,
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
    @Body() forgetPasswordDto: EmployeeForgetPasswordDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<EmployeeForgetPasswordResponseDto> {
    return this.employeeAuthService.forgetPassword(
      forgetPasswordDto,
      ip,
      userAgent,
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: EmployeeResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or password validation failed',
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
    @Body() resetPasswordDto: EmployeeResetPasswordDto,
    @Ip() ip,
    @Headers('user-agent') userAgent?: string,
  ): Promise<EmployeeResetPasswordResponseDto> {
    return this.employeeAuthService.resetPassword(
      resetPasswordDto,
      ip,
      userAgent,
    );
  }

  @Get('login-history')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Login history',
    type: EmployeeLoginHistorySearchDto,
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.READ_ONE] }])
  loginHistory(@Query() data: EmployeeLoginHistorySearchDto) {
    return this.employeeAuthService.loginHistory(data);
  }

  @Get('my-login-history')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'My login history',
    type: EmployeeLoginHistorySearchDto,
  })
  myLoginHistory(
    @Query() data: EmployeeLoginHistorySearchDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    data.employee_id = request.user.sub;
    if (!data.employee_id) {
      throw new UnauthorizedException('Invalid token: Employee ID not found');
    }
    return this.employeeAuthService.loginHistory(data);
  }
}
