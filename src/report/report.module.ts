import { Module } from '@nestjs/common';
import { JournalController } from './report.controller';
import { JournalService } from './report.service';

@Module({
  controllers: [JournalController],
  providers: [JournalService],
})
export class ReportModule {}
