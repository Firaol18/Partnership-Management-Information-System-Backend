import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { DatabaseService } from '../../common/database/database.service';
import { AuthorizationService } from '../../common/services/authorization.service';
import { SmsService } from '../../common/services/sms.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: DatabaseService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: SmsService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
