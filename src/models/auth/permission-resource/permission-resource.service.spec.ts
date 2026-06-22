import { Test, TestingModule } from '@nestjs/testing';
import { PermissionResourceService } from './permission-resource.service';
import { DatabaseService } from '../../../common/database/database.service';

describe('PermissionResourceService', () => {
  let service: PermissionResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionResourceService,
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<PermissionResourceService>(PermissionResourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
