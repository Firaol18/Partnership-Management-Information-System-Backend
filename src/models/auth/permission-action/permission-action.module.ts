import { Module } from '@nestjs/common';
import { PermissionActionService } from './permission-action.service';
import { PermissionActionController } from './permission-action.controller';
import { DatabaseModule } from '../../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PermissionActionController],
  providers: [PermissionActionService],
  exports: [PermissionActionService],
})
export class PermissionActionModule {}
