import { Controller, Post, Body } from '@nestjs/common';
import { JounalService } from './jounal.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('jounal')
@Controller('jounal')
export class JounalController {
  constructor(private jounalService: JounalService) {}

  @Post('transcribe')
  async transcribe(@Body() audioBuffer: Buffer) {
    return this.jounalService.transcribeAudioStream(audioBuffer);
  }
}
