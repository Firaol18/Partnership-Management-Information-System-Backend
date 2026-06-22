import { Module } from '@nestjs/common';
import { PartnershipOpportunityService } from './partnership-opportunity.service';
import { PartnershipOpportunityController } from './partnership-opportunity.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PartnershipOpportunityController],
  providers: [PartnershipOpportunityService],
  exports: [PartnershipOpportunityService],
})
export class PartnershipOpportunityModule {}
