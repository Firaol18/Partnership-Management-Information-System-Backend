import { Module } from '@nestjs/common';
import { PermissionResourceService } from './permission-resource.service';
import { PermissionResourceController } from './permission-resource.controller';
import { DatabaseModule } from '../../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PermissionResourceController],
  providers: [PermissionResourceService],
  exports: [PermissionResourceService],
})
export class PermissionResourceModule {}
