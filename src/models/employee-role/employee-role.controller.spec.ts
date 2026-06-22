import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRoleController } from './employee-role.controller';
import { EmployeeRoleService } from './employee-role.service';

describe('EmployeeRoleController', () => {
  let controller: EmployeeRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeRoleController],
      providers: [
        {
          provide: EmployeeRoleService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<EmployeeRoleController>(EmployeeRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
