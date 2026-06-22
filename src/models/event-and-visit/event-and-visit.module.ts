import { Module } from '@nestjs/common';
import { EventAndVisitService } from './event-and-visit.service';
import { EventAndVisitController } from './event-and-visit.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EventAndVisitController],
  providers: [EventAndVisitService],
  exports: [EventAndVisitService],
})
export class EventAndVisitModule {}
