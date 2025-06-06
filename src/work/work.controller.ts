import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkService } from './work.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateWorkDto } from './dto/create-work.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiTags('work')
@Controller('work')
export class WorkController {
  constructor(private workService: WorkService) {}

  @Post('start')
  async postWorkIn(@CurrentUser() user, @Body() { clientId }: CreateWorkDto) {
    return await this.workService.createWorkIn(user.id, clientId);
  }

  @Post('end')
  async postWorkOut(@CurrentUser() user, @Body() { clientId }: CreateWorkDto) {
    return await this.workService.createWorkOut(user.id, clientId);
  }
}
