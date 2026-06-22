import { Test, TestingModule } from '@nestjs/testing';
import { PermissionActionService } from './permission-action.service';
import { DatabaseService } from '../../../common/database/database.service';

describe('PermissionActionService', () => {
  let service: PermissionActionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionActionService,
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<PermissionActionService>(PermissionActionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
