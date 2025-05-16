import { Body, Controller, Post } from '@nestjs/common';
import { JournalService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('report')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.journalService.create(dto);
  }
}
