import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RefreshTokenService } from '../../../common/services/refresh-token.service';
import { OtpService } from '../../../common/services/otp.service';
import { PasswordService } from '../../../common/services/password.service';
import { RateLimitService } from '../../../common/services/rate-limit.service';
import { AuthAuditService } from '../../../common/services/auth-audit.service';
import { SmsService } from '../../../common/services/sms.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { DatabaseModule } from '../../../common/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>('AUTH_JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '15m',
            issuer: configService.get<string>('JWT_ISSUER', 'pmis-backend'),
            audience: configService.get<string>(
              'JWT_AUDIENCE',
              'pmis-users',
            ),
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: configService.get<string>('JWT_ISSUER', 'pmis-backend'),
            audience: configService.get<string>(
              'JWT_AUDIENCE',
              'pmis-users',
            ),
            clockTolerance: 30,
          },
        };
      },
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    OtpService,
    PasswordService,
    RateLimitService,
    AuthAuditService,
    SmsService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [
    AuthService,
    RefreshTokenService,
    OtpService,
    PasswordService,
    RateLimitService,
    AuthAuditService,
    SmsService,
  ],
})
export class AuthModule {}
