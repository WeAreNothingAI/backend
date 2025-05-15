import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class JounalService {
  constructor(private readonly httpService: HttpService) {}

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    const formData = new FormData();

    formData.append('audio', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5000/transcribe', formData, {
          headers: formData.getHeaders(),
        }),
      );

      return response.data.text;
    } catch (err) {
      throw new InternalServerErrorException(
        '실시간 STT 처리 중 오류가 발생했습니다.',
      );
    }
  }

  async transcribeAudioStream(audioBuffer: Buffer): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5000/transcribe', audioBuffer, {
          headers: {
            'Content-Type': 'audio/wav',
          },
        }),
      );

      return response.data.text;
    } catch (err) {
      throw new InternalServerErrorException(
        '실시간 STT 처리 중 오류가 발생했습니다.',
      );
    }
  }
}
