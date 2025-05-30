import { Injectable, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GenerateJournalDocxResponseDto } from './dto/generate-journal-docx-response.dto';
import { S3Service } from '../s3/s3.service';

// Journal → python-report 요청용 매핑 유틸 함수 (클래스 정의 위에 선언)
function mapJournalToRequest(journal: any) {
  return {
    text: journal.transcript,
    date: journal.createdAt.toISOString().slice(0, 10),
    service: '',
    manager: journal.careWorker?.name ?? '',
    method: '',
    type: '',
    time: '',
    title: '',
    category: '',
    client: journal.client?.name ?? '',
    contact: journal.client?.contact ?? '',
    opinion: journal.opinion ?? '',
    result: journal.result ?? '',
    note: journal.note ?? '',
  };
}

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
    private readonly s3Service: S3Service,
  ) {
    this.sttServerUrl = this.configService.get<string>('STT_SERVER_URL', 'http://localhost:5000/transcribe');
    this.sttTimeout = this.configService.get<number>('STT_TIMEOUT', 60000);
    this.logger.log(`Initialized with STT_SERVER_URL: ${this.sttServerUrl}, STT_TIMEOUT: ${this.sttTimeout}`);
  }

  async uploadAudioFile(file: Express.Multer.File): Promise<string> {
    try {
      const key = `${Date.now()}-${file.originalname}`;
      const url = await this.s3Service.uploadAudio(file, key);
      return url;
    } catch (error) {
      this.logger.error('Error uploading audio file to S3:', error);
      throw new InternalServerErrorException('오디오 파일 업로드 중 오류가 발생했습니다.');
    }
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
              timeout: 60000,
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

  async uploadAudioBuffer(buffer: Buffer, filename: string): Promise<string> {
    const file = {
      fieldname: 'audio',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'audio/webm',
      buffer,
      size: buffer.length,
      destination: '',
      filename,
      path: '',
      stream: null as any,
    };
    
    return await this.s3Service.uploadAudio(file, filename);
  }

  async createJournal(data: {
    clientId: number;
    careWorkerId: number;
    audioBuffer: Buffer;
    transcript: string;
    summary?: string | null;
    recommendations?: string | null;
    opinion?: string | null;
    result?: string | null;
    note?: string | null;
    exportedPdf?: string | null;
    exportedDocx?: string | null;
  }) {
    try {
      const filename = `audio_${data.clientId}_${Date.now()}.webm`;
      const rawAudioUrl = await this.uploadAudioBuffer(data.audioBuffer, filename);
      
      this.logger.debug('Creating journal entry with audio URL:', rawAudioUrl);

      const result = await this.prisma.journal.create({
        data: {
          clientId: data.clientId,
          careWorkerId: data.careWorkerId,
          rawAudioUrl,
          transcript: data.transcript,
          summary: data.summary ?? '',
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

  async generateJournalDocx(journalData: any): Promise<GenerateJournalDocxResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://localhost:5000/generate-journal-docx', // python-report FastAPI 주소
          journalData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
          },
        )
      );
      return response.data as GenerateJournalDocxResponseDto; // { file, path } 등 반환
    } catch (error) {
      this.logger.error('python-report 호출 중 오류:', error);
      throw new InternalServerErrorException('문서 생성 중 오류가 발생했습니다.', error.message);
    }
  }

  async summarizeJournal(id: number) {
    const journal = await this.prisma.journal.findUnique({
      where: { id: Number(id) },
      include: { client: true, careWorker: true },
    });
    if (!journal) throw new Error('일지를 찾을 수 없습니다.');

    const requestBody = mapJournalToRequest(journal);

    const { data } = await firstValueFrom(
      this.httpService.post('http://127.0.0.1:5000/generate-journal-docx', requestBody, { timeout: 60000 })
    );

    const updated = await this.prisma.journal.update({
      where: { id: journal.id },
      data: {
        exportedDocx: data.docx_url,
        exportedPdf: data.pdf_url,
        summary: data.summary,
        recommendations: data.recommendations,
        opinion: data.opinion,
        result: data.result,
        note: data.note,
      },
    });

    return {
      file: data.file,
      docx_url: data.docx_url,
      pdf_url: data.pdf_url,
      summary: data.summary,
      recommendations: data.recommendations,
      opinion: data.opinion,
      result: data.result,
      note: data.note,
      updated,
    };
  }

  async convertJournalPdf(id: number) {
    try {
      // 1. DB에서 docx 파일명 조회
      const journal = await this.prisma.journal.findUnique({
        where: { id: Number(id) },
      });
      if (!journal || !journal.exportedDocx) throw new Error('docx 파일이 존재하지 않습니다.');

      // 2. docx 파일명 추출 (S3 URL 또는 Key에서 파일명만 추출)
      let fileName = journal.exportedDocx as string;
      if (fileName.includes('/')) fileName = fileName.split('/').pop() as string;

      // 3. Python 서버에 PDF 변환 요청
      const { data } = await firstValueFrom(
        this.httpService.post('http://127.0.0.1:5000/generate-journal-docx/convert-journal-pdf', { file_name: fileName }, { timeout: 60000 })
      );

      // 4. DB에 pdf_url 저장
      await this.prisma.journal.update({
        where: { id: journal.id },
        data: { exportedPdf: data.pdf_url },
      });

      // 5. pdf_url 반환
      return { pdf_url: data.pdf_url };
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'PDF 변환 중 오류가 발생했습니다.';
      const status = error?.status || error?.response?.status || 500;
      // OS별 안내 메시지 추가
      let osHint = '';
      if (msg.includes('docx2pdf')) osHint = ' (윈도우 환경: Microsoft Word 및 docx2pdf 패키지가 필요합니다)';
      if (msg.includes('LibreOffice')) osHint = ' (리눅스 환경: LibreOffice가 설치되어 있어야 합니다)';
      throw new HttpException(msg + osHint, status);
    }
  }

  async getDocxPresignedUrl(id: number) {
    // 1. DB에서 docx 파일명(S3 Key) 조회
    const journal = await this.prisma.journal.findUnique({ where: { id: Number(id) } });
    if (!journal || !journal.exportedDocx) throw new Error('docx 파일이 존재하지 않습니다.');
    let fileName = journal.exportedDocx as string;
    if (fileName.includes('/')) fileName = fileName.split('/').pop() as string;
    // 2. Python 서버 presigned url API 호출
    const { data } = await firstValueFrom(
      this.httpService.post('http://127.0.0.1:5000/generate-journal-docx/download-docx-url', { file_name: fileName }, { timeout: 10000 })
    );
    return data;
  }

  async getPdfPresignedUrl(id: number) {
    // 1. DB에서 pdf 파일명(S3 Key) 조회
    const journal = await this.prisma.journal.findUnique({ where: { id: Number(id) } });
    if (!journal || !journal.exportedPdf) throw new Error('pdf 파일이 존재하지 않습니다.');
    let fileName = journal.exportedPdf as string;
    if (fileName.includes('/')) fileName = fileName.split('/').pop() as string;
    // 2. Python 서버 presigned url API 호출
    const { data } = await firstValueFrom(
      this.httpService.post('http://127.0.0.1:5000/generate-journal-docx/download-pdf-url', { file_name: fileName }, { timeout: 10000 })
    );
    return data;
  }
}
