import { 
  Controller, 
  Post, 
  Param, 
  HttpCode, 
  HttpException, 
  HttpStatus,
  Patch,
  Body,
  ParseIntPipe,
  Get
 } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { 
  GenerateJournalDocxResponseDto, 
  GenerateJournalPdfResponseDto 
} from './dto/generate-journal-docx-response.dto';
import { TranscriptUpdateDto } from './dto/update-transcript.dto';
import { JournalSummaryResponseDto } from './dto/journal-summary-response.dto';
import { DownloadUrlResponseDto } from './dto/download-url-response.dto';
import { JournalListItemDto } from './dto/journal-list-item.dto';

@ApiTags('journal')
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  // 일지 요약 생성 API
  @Post(':id/summary')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '상담 일지 요약 및 문서 생성',
    description:
      'DB에 저장된 transcript이나 editedTranscript가 있다면<br>그것을 기반으로 python-report를 호출해 상담일지(docx)를 생성합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '상담일지 docx 파일 생성 성공',
    type: GenerateJournalDocxResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '일지를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '서버 오류',
  })
  async summarizeJournal(
    @Param('id') id: number,
  ): Promise<GenerateJournalDocxResponseDto> {
    try {
      const result = await this.journalService.summarizeJournal(id);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        '상담일지 요약 생성 중 서버 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PDF 변환 전용 API
  @Post(':id/convert-pdf')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '상담 일지 PDF 변환',
    description: '이미 생성된 docx 파일을 pdf로 변환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '상담일지 pdf 파일 변환 성공',
    type: GenerateJournalPdfResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '서버 오류',
  })
  async convertJournalPdf(
    @Param('id') id: number,
  ): Promise<GenerateJournalPdfResponseDto> {
    try {
      return await this.journalService.convertJournalPdf(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'PDF 변환 중 서버 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DOCX presigned url 반환
  @Post(':id/download-docx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'DOCX presigned url 반환', 
    description: 'S3에 업로드된 docx presigned url을 반환합니다.' 
  })
  @ApiOkResponse({ 
    description: 'DOCX presigned url 반환', 
    type: DownloadUrlResponseDto 
  })
  async downloadDocx(@Param('id') id: number): Promise<DownloadUrlResponseDto> {
    try {
      return await this.journalService.getDocxPresignedUrl(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'DOCX presigned url 생성 중 서버 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PDF presigned url 반환
  @Post(':id/download-pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'PDF presigned url 반환', 
    description: 'S3에 업로드된 pdf presigned url을 반환합니다.' 
  })
  @ApiOkResponse({ 
    description: 'PDF presigned url 반환', 
    type: DownloadUrlResponseDto 
  })
  async downloadPdf(@Param('id') id: number): Promise<DownloadUrlResponseDto> {
    try {
      return await this.journalService.getPdfPresignedUrl(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'PDF presigned url 생성 중 서버 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/edit-transcript')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'STT 결과 수정',
    description: '수정된 transcript를 DB에 저장합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '수정 완료된 journal 객체 반환',
  })
  async updateTranscript(
    @Param('id', ParseIntPipe) id: number,
    @Body() { editedTranscript }: TranscriptUpdateDto,
  ) {
    return this.journalService.modifyTranscript(id, editedTranscript);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '상담일지 요약 상세 조회', description: '상담일지의 summary, recommendations, opinion, result, note만 반환합니다.' })
  @ApiOkResponse({
    description: '상담일지 요약 상세 조회',
    type: JournalSummaryResponseDto,
  })
  async getJournalSummary(@Param('id') id: number): Promise<JournalSummaryResponseDto> {
    try {
      return await this.journalService.getJournalSummary(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('상담일지 상세 조회 중 서버 오류', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
