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
    summary?: string | null;
    issues?: string | null;
    recommendations?: string | null;
    opinion?: string | null;
    result?: string | null;
    note?: string | null;
    exportedPdf?: string | null;
    exportedDocx?: string | null;
  }) {
    try {
      this.logger.debug('Creating journal entry:', data);

      const result = await this.prisma.journal.create({
        data: {
          clientId: data.clientId,
          careWorkerId: data.careWorkerId,
          rawAudioUrl: data.rawAudioUrl,
          transcript: data.transcript,
          summary: data.summary ?? '',
          issues: data.issues ?? '',
          recommendations: data.recommendations ?? '',
          opinion: data.opinion ?? '',
          result: data.result ?? '',
          note: data.note ?? '',
          exportedPdf: data.exportedPdf ?? '',
          exportedDocx: data.exportedDocx ?? '',
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

  async generateJournalDocx(journalData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://localhost:8000/generate-journal-docx', // python-report FastAPI 주소
          journalData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
          },
        )
      );
      return response.data; // { file, path } 등 반환
    } catch (error) {
      this.logger.error('python-report 호출 중 오류:', error);
      throw new InternalServerErrorException('문서 생성 중 오류가 발생했습니다.', error.message);
    }
  }

  async summarizeJournal(id: number) {
    // 1. DB에서 일지 + 관계 정보(transcript, client, careWorker 등) 조회
    const journal = await this.prisma.journal.findUnique({ 
      where: { id: Number(id) },
      include: {
        client: true,
        careWorker: true,
      },
    });
    if (!journal) throw new Error('일지를 찾을 수 없습니다.');

    // 2. python-report에 맞는 JSON 생성
    const requestBody = {
      text: journal.transcript,
      date: journal.createdAt.toISOString().slice(0, 10),
      service: '', // DB에 없으면 빈 문자열
      manager: journal.careWorker?.name ?? '',
      method: '', // DB에 없으면 빈 문자열
      type: '', // DB에 없으면 빈 문자열
      time: '', // DB에 없으면 빈 문자열
      title: '', // DB에 없으면 빈 문자열
      category: '', // DB에 없으면 빈 문자열
      client: journal.client?.name ?? '',
      contact: journal.client?.contact ?? '',
      opinion: journal.opinion ?? '',
      result: journal.result ?? '',
      note: journal.note ?? '',
    };

    // 3. python-report로 요약/문서생성 요청
    const reportRes = await firstValueFrom(
      this.httpService.post('http://127.0.0.1:8000/generate-journal-docx', requestBody)
    );
    const { file, path } = reportRes.data;

    // 4. DB 업데이트 (생성된 docx 경로 등 저장)
    const updated = await this.prisma.journal.update({
      where: { id: journal.id },
      data: {
        exportedDocx: path,
        // summary, recommendations 등도 필요시 저장
      },
    });

    return {
      file,
      path,
      updated,
    };
  }
}
