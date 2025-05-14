import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SessionService as SessionService } from './session.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileUploadDto } from './dto/file-upload.dto';

@ApiTags('session')
@Controller('session')
export class SessionController {
  constructor(private sttService: SessionService) {}

  @Post('upload-audio')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file'))
  async stt(@UploadedFile() file: Express.Multer.File) {
    return this.sttService.transcribeAudio(file);
  }
}
