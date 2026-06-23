import { Module } from '@nestjs/common';
import { PartnershipEngagementService } from './partnership-engagement.service';
import { PartnershipEngagementController } from './partnership-engagement.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PartnershipEngagementController],
  providers: [PartnershipEngagementService],
  exports: [PartnershipEngagementService],
})
export class PartnershipEngagementModule {}
