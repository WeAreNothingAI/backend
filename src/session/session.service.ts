import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class SessionService {
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
          headers: formData.getHeaders(), // FormData 헤더 설정
        }),
      );

      return response.data.text;
    } catch (err) {
      throw new HttpException('STT Error', 500);
    }
  }
}
