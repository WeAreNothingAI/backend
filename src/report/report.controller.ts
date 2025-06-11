import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateWeeklyReportFlexibleDto } from './dto/create-weekly-report-flexible.dto';
import { CreateWeeklyReportResponseDto, WEEKLY_REPORT_RESPONSE_EXAMPLE } from './dto/create-weekly-report-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DownloadUrlResponseDto } from '../journal/dto/download-url-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiTags('report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '주간보고서 생성 (어르신별 자동 그룹화 지원)',
    description: '일지 id 배열(journalIds, 여러 어르신 섞여도 됨) 또는 기간만 받아, 어르신별로 자동 그룹화하여 주간보고서를 각각 생성합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '주간보고서 docx/pdf 파일 생성 성공 (배열)',
    type: CreateWeeklyReportResponseDto,
    isArray: true,
    schema: {
      example: WEEKLY_REPORT_RESPONSE_EXAMPLE
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: `잘못된 요청(입력값 누락/유효하지 않은 값 등)
    <br>- journalIds 또는 기간 중 하나는 필수입니다.
    <br>- 기간은 최대 7일(1주일)까지만 선택할 수 있습니다.`,
    schema: {
      example: { statusCode: 400, message: 'journalIds 또는 기간 중 하나는 필수입니다.', error: 'Bad Request' }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '조건에 맞는 일지/보고서가 없음',
    schema: {
      example: { statusCode: 404, message: '조건에 맞는 일지가 없습니다.', error: 'Not Found' }
    }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '복지사 권한 없음',
    schema: {
      example: { statusCode: 403, message: '복지사만 접근할 수 있습니다.', error: 'Forbidden' }
    }
  })
  @ApiBody({
    schema: {
      oneOf: [
        { example:
          { periodStart: '2025-06-09', periodEnd: '2025-06-13' } 
        },
        { example:
           { journalIds: [1,2,3,4,5] } 
        }
      ]
    }
  })
  async create(
    @Body() dto: CreateWeeklyReportFlexibleDto,
    @CurrentUser() user,
  ): Promise<CreateWeeklyReportResponseDto[]> {
    // 빈 배열이면 undefined로 강제 세팅
    if (Array.isArray(dto.journalIds) && dto.journalIds.length === 0) {
      dto.journalIds = undefined;
    }
    console.log('==== [컨트롤러] dto.journalIds:', dto.journalIds);
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 접근할 수 있습니다.');
    }
    return this.reportService.createWeeklyReportsGrouped(dto, user);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '주간보고서 상세 조회',
    description: '주간보고서 상세 정보를 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '주간보고서 상세 정보 반환',
    type: CreateWeeklyReportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청(파라미터 누락/유효하지 않은 id 등)',
    schema: {
      example: { statusCode: 400, message: '유효한 보고서 id를 입력하세요.', error: 'Bad Request' }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '주간보고서를 찾을 수 없음',
    schema: {
      example: { statusCode: 404, message: '주간보고서를 찾을 수 없습니다.', error: 'Not Found' }
    }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '복지사 권한 없음',
    schema: {
      example: { statusCode: 403, message: '복지사만 접근할 수 있습니다.', error: 'Forbidden' }
    }
  })
  async findWeeklyReport(
    @Param('id') id: string,
    @CurrentUser() user,
  ): Promise<CreateWeeklyReportResponseDto> {
    // 복지사만 조회 가능
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 접근할 수 있습니다.');
    }

    return this.reportService.findWeeklyReport(id);
  }

  @Post(':id/download-docx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '주간보고서 DOCX presigned url 반환',
    description: 'S3에 업로드된 주간보고서 docx presigned url을 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'DOCX presigned url 반환',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'docx 파일이 존재하지 않음',
    schema: { example: { statusCode: 404, message: 'docx 파일이 존재하지 않습니다.', error: 'Not Found' } }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '복지사 권한 없음',
    schema: { example: { statusCode: 403, message: '복지사만 접근할 수 있습니다.', error: 'Forbidden' } }
  })
  async downloadWeeklyDocx(
    @Param('id') id: string,
    @CurrentUser() user,
  ): Promise<DownloadUrlResponseDto> {
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 접근할 수 있습니다.');
    }
    return this.reportService.findWeeklyReportDocxPresignedUrl(Number(id));
  }

  @Post(':id/download-pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '주간보고서 PDF presigned url 반환',
    description: 'S3에 업로드된 주간보고서 pdf presigned url을 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF presigned url 반환',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'pdf 파일이 존재하지 않음',
    schema: { example: { statusCode: 404, message: 'pdf 파일이 존재하지 않습니다.', error: 'Not Found' } }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '복지사 권한 없음',
    schema: { example: { statusCode: 403, message: '복지사만 접근할 수 있습니다.', error: 'Forbidden' } }
  })
  async downloadWeeklyPdf(
    @Param('id') id: string,
    @CurrentUser() user,
  ): Promise<DownloadUrlResponseDto> {
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 접근할 수 있습니다.');
    }
    return this.reportService.findWeeklyReportPdfPresignedUrl(Number(id));
  }
}
