import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { DatabaseService } from '../../common/database/database.service';
import { EmployeeAuthGuard } from '../../common/guards/employee-auth.guard';

describe('EmployeeController', () => {
  let controller: EmployeeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: EmployeeService, useValue: {} },
        { provide: DatabaseService, useValue: {} },
      ],
    })
      .overrideGuard(EmployeeAuthGuard)
      .useValue({})
      .compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
