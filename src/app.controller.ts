import { Controller, Get } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly httpService: HttpService,
    private readonly appService: AppService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping-whisper')
  async pingWhisper() {
    const whisperUrl = 'http://python.service:5000'; // 루트 라우트

    try {
      const { data } = await firstValueFrom(this.httpService.get(whisperUrl));
      return {
        message: 'Whisper 연결 성공',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Whisper 연결 실패',
          error: error.message,
        },
        500,
      );
    }
  }
}
