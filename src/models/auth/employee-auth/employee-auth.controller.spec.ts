import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeAuthController } from './employee-auth.controller';
import { EmployeeAuthService } from './employee-auth.service';
import { EmployeeRefreshTokenGuard } from '../../../common/guards/employee-refresh-token.guard';
import { EmployeeAuthGuard } from '../../../common/guards/employee-auth.guard';

describe('EmployeeAuthController', () => {
  let controller: EmployeeAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeAuthController],
      providers: [
        {
          provide: EmployeeAuthService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(EmployeeRefreshTokenGuard)
      .useValue({})
      .overrideGuard(EmployeeAuthGuard)
      .useValue({})
      .compile();

    controller = module.get<EmployeeAuthController>(EmployeeAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
