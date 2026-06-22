import { Test, TestingModule } from '@nestjs/testing';
import { PermissionResourceController } from './permission-resource.controller';
import { PermissionResourceService } from './permission-resource.service';

describe('PermissionResourceController', () => {
  let controller: PermissionResourceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionResourceController],
      providers: [
        {
          provide: PermissionResourceService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PermissionResourceController>(PermissionResourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
