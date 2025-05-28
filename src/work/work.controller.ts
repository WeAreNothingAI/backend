import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkService } from './work.service';

@ApiTags('work')
@Controller('work')
export class WorkController {
  constructor(private workService: WorkService) {}

  @Post('start/:id')
  async postWorkIn(@Param('id', ParseIntPipe) memberId: number) {
    return await this.workService.createWorkIn(memberId);
  }

  @Post('end/:id')
  async postWorkOut(@Param('id', ParseIntPipe) memberId: number) {
    return await this.workService.createWorkOut(memberId);
  }
}
