import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly sttServerUrl: string;
  private readonly sttTimeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.sttServerUrl = this.configService.get<string>('STT_SERVER_URL', 'http://localhost:5000/transcribe');
    this.sttTimeout = this.configService.get<number>('STT_TIMEOUT', 30000);
    this.logger.log(`Initialized with STT_SERVER_URL: ${this.sttServerUrl}, STT_TIMEOUT: ${this.sttTimeout}`);
  }

  async transcribeAudioStream(audioBuffer: Buffer): Promise<string> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(`STT attempt ${attempt}/${this.maxRetries}`);
        
        const response = await firstValueFrom(
          this.httpService.post(
            this.sttServerUrl,
            audioBuffer,
            {
              headers: {
                'Content-Type': 'audio/webm',
              },
              timeout: this.sttTimeout,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
            },
          ),
        );

        if (!response.data || !response.data.text) {
          throw new Error('STT 서버로부터 유효한 응답을 받지 못했습니다.');
        }

        return response.data.text.trim();
      } catch (error) {
        lastError = error;
        this.logger.error(
          `STT attempt ${attempt}/${this.maxRetries} failed:`,
          error.response?.data || error.message,
        );

        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.logger.log(`Retrying STT... (${attempt}/${this.maxRetries})`);
        }
      }
    }

    throw new InternalServerErrorException(
      '실시간 STT 처리 중 오류가 발생했습니다.',
      lastError?.message,
    );
  }

  async createJournal(data: {
    clientId: number;
    careWorkerId: number;
    rawAudioUrl: string;
    transcript: string;
  }) {
    try {
      this.logger.debug('Creating journal entry:', data);

      const result = await this.prisma.journal.create({
        data: {
          clientId: data.clientId,
          careWorkerId: data.careWorkerId,
          rawAudioUrl: data.rawAudioUrl,
          transcript: data.transcript,
        },
      });

      this.logger.debug('Journal entry created:', result);

      return result;
    } catch (error) {
      this.logger.error('Error creating journal entry:', error);
      
      throw new InternalServerErrorException(
        '일지 저장 중 오류가 발생했습니다.',
        error.message,
      );
    }
  }
}
