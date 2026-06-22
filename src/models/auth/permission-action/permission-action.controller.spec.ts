import { Test, TestingModule } from '@nestjs/testing';
import { PermissionActionController } from './permission-action.controller';
import { PermissionActionService } from './permission-action.service';

describe('PermissionActionController', () => {
  let controller: PermissionActionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionActionController],
      providers: [
        {
          provide: PermissionActionService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PermissionActionController>(PermissionActionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
