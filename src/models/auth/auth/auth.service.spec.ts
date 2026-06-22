import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../../common/database/database.service';
import { AuthorizationService } from '../../../common/services/authorization.service';
import { RefreshTokenService } from '../../../common/services/refresh-token.service';
import { OtpService } from '../../../common/services/otp.service';
import { PasswordService } from '../../../common/services/password.service';
import { RateLimitService } from '../../../common/services/rate-limit.service';
import { AuthAuditService } from '../../../common/services/auth-audit.service';
import { SmsService } from '../../../common/services/sms.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: DatabaseService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: RefreshTokenService, useValue: {} },
        { provide: OtpService, useValue: {} },
        { provide: PasswordService, useValue: {} },
        { provide: RateLimitService, useValue: {} },
        { provide: AuthAuditService, useValue: {} },
        { provide: SmsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
