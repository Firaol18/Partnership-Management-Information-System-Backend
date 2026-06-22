import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRoleService } from './employee-role.service';
import { DatabaseService } from '../../common/database/database.service';

describe('EmployeeRoleService', () => {
  let service: EmployeeRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRoleService,
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmployeeRoleService>(EmployeeRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
