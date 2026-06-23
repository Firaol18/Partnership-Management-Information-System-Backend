import { Module } from '@nestjs/common';
import { PartnershipAgreementService } from './partnership-agreement.service';
import { PartnershipAgreementController } from './partnership-agreement.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PartnershipAgreementController],
  providers: [PartnershipAgreementService],
  exports: [PartnershipAgreementService],
})
export class PartnershipAgreementModule {}
