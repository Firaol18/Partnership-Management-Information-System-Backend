import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PublicEmployeeController } from './public-employee.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { AuthorizationModule } from '../../common/services/authorization.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from '../../common/services/refresh-token.service';
import { SmsService } from '../../common/services/sms.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
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
  controllers: [
    EmployeeController,
    PublicEmployeeController,
  ],
  providers: [
    EmployeeService,
    RefreshTokenService,
    SmsService,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}
