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
  Get,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JournalService } from './journal.service';
import {
  GenerateJournalDocxResponseDto,
  GenerateJournalPdfResponseDto,
} from './dto/generate-journal-docx-response.dto';
import { TranscriptUpdateDto } from './dto/update-transcript.dto';
import { JournalSummaryResponseDto } from './dto/journal-summary-response.dto';
import { DownloadUrlResponseDto } from './dto/download-url-response.dto';
import {
  GetJournalListByDateRangeQueryDto,
  GetJournalListByDateRangeResponseDto,
} from './dto/journal-list-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiTags('journal')
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @ApiOperation({
    summary: '일지 목록 조회',
    description: '특정 요양보호사의 날짜 범위 내 일지 목록을 조회합니다.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: '시작 날짜 (YYYY-MM-DD 형식)',
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: '종료 날짜 (YYYY-MM-DD 형식)',
    type: String,
    example: '2024-01-31',
  })
  @ApiQuery({
    name: 'careworkerId',
    required: true,
    description: '요양보호사 ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '일지 목록 조회 성공',
    type: GetJournalListByDateRangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 날짜 형식 또는 날짜 범위',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @Get('list/date-range')
  async getJournalListByDateRange(
    @Query() query: GetJournalListByDateRangeQueryDto,
  ): Promise<GetJournalListByDateRangeResponseDto> {
    const parsedStartDate = new Date(query.startDate);
    const parsedEndDate = new Date(query.endDate);

    // 날짜 유효성 검사
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return {
        success: false,
        data: [],
      };
    }

    if (parsedStartDate > parsedEndDate) {
      return {
        success: false,
        data: [],
      };
    }

    return {
      success: true,
      data: await this.journalService.getJournalListByDateRange(
        parsedStartDate,
        parsedEndDate,
        query.careworkerId,
      ),
    };
  }

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
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ): Promise<GenerateJournalDocxResponseDto> {
    if (user.role !== 'careWorker') {
      throw new ForbiddenException('요양보호사만 접근할 수 있습니다.');
    }
    try {
      const result = await this.journalService.summarizeJournal({
        id,
        careWorkerId: user.id,
      });
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
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ): Promise<GenerateJournalPdfResponseDto> {
    if (user.role !== 'careWorker') {
      throw new ForbiddenException('요양보호사만 접근할 수 있습니다.');
    }
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
    description: 'S3에 업로드된 docx presigned url을 반환합니다.',
  })
  @ApiOkResponse({
    description: 'DOCX presigned url 반환',
    type: DownloadUrlResponseDto,
  })
  async downloadDocx(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ): Promise<DownloadUrlResponseDto> {
    if (user.role !== 'careWorker') {
      throw new ForbiddenException('요양보호사만 접근할 수 있습니다.');
    }
    try {
      return await this.journalService.findDocxPresignedUrl(id);
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
    description: 'S3에 업로드된 pdf presigned url을 반환합니다.',
  })
  @ApiOkResponse({
    description: 'PDF presigned url 반환',
    type: DownloadUrlResponseDto,
  })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ): Promise<DownloadUrlResponseDto> {
    if (user.role !== 'careWorker') {
      throw new ForbiddenException('요양보호사만 접근할 수 있습니다.');
    }
    try {
      return await this.journalService.findPdfPresignedUrl(id);
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
    @CurrentUser() user,
  ) {
    return this.journalService.modifyTranscript({
      id,
      editedTranscript,
      careWorkerId: user.id,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '상담일지 요약 상세 조회',
    description:
      '상담일지의 summary, recommendations, opinion, result, note만 반환합니다.',
  })
  @ApiOkResponse({
    description: '상담일지 요약 상세 조회',
    type: JournalSummaryResponseDto,
  })
  async getJournalSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ): Promise<JournalSummaryResponseDto> {
    // 역할에 따라 적절한 ID를 넘김
    const socialWorkerId = user.role === 'socialWorker' ? user.id : undefined;
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    try {
      return await this.journalService.findJournalSummary({
        id,
        socialWorkerId,
        careWorkerId,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        '상담일지 상세 조회 중 서버 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/raw-audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '녹음된 일지 듣기',
    description: '녹음된 일지를 듣습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '녹음된 일지 주소',
  })
  @ApiResponse({
    status: 404,
    description: '해당 일지는 존재하지 않습니다.',
  })
  @ApiResponse({
    status: 403,
    description: '본인이 녹음한 일지가 아닙니다.',
  })
  async getRawAudioUrl(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
  ) {
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    return await this.journalService.findRawAudio(id, careWorkerId);
  }
}
