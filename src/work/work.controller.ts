import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkService } from './work.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiTags('work')
@Controller('work')
export class WorkController {
  constructor(private workService: WorkService) {}

  @Post('start')
  async postWorkIn(@CurrentUser() user) {
    return await this.workService.createWorkIn(user.id);
  }

  @Post('end')
  async postWorkOut(@CurrentUser() user) {
    return await this.workService.createWorkOut(user.id);
  }
}
