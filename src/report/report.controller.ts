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
import { CreateWeeklyReportResponseDto } from './dto/create-weekly-report-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

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
    description: '일지 id 배열(journalIds, 여러 어르신 섞여도 됨) 또는 기간만 받아, 어르신별로 자동 그룹화화하여 주간보고서를 각각 생성합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '주간보고서 docx/pdf 파일 생성 성공 (배열)',
    type: CreateWeeklyReportResponseDto,
    isArray: true,
  })
  @ApiBody({
    schema: {
      oneOf: [
        { example:
           { journalIds: [1,2,3,4,5] } 
          },
        { example:
          { periodStart: '2025-05-01', periodEnd: '2025-05-07' 
          } 
        }
      ]
    }
  })
  async create(
    @Body() dto: CreateWeeklyReportFlexibleDto,
    @CurrentUser() user,
  ): Promise<CreateWeeklyReportResponseDto[]> {
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
  async getWeeklyReportDetail(
    @Param('id') id: string,
    @CurrentUser() user,
  ): Promise<CreateWeeklyReportResponseDto> {
    // 복지사만 조회 가능
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 접근할 수 있습니다.');
    }
    return this.reportService.getWeeklyReportDetail(id);
  }
}
