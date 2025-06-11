import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CareworkerService } from './careworker.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCareworkersResponseDto } from './dto/get-careworkers.dto';
import {
  GetThisWeekWorksQueryDto,
  GetThisWeekWorksResponseDto,
  GetWorksByDateRangeQueryDto,
  GetWorksByDateRangeResponseDto,
} from './dto/get-works.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('요양보호사 (Careworker)')
@ApiBearerAuth('JWT')
@Controller('careworker')
@UseGuards(JwtAuthGuard)
export class CareworkerController {
  constructor(private readonly careworkerService: CareworkerService) {}

  @ApiOperation({
    summary: '요양보호사 목록 조회',
    description:
      'role이 careworker인 모든 멤버들의 목록을 조회합니다. (socialWorker 권한 필요)',
  })
  @ApiResponse({
    status: 200,
    description: '요양보호사 목록 조회 성공',
    type: GetCareworkersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (socialWorker만 접근 가능)',
  })
  @Get()
  async getCareworkers(@Request() req): Promise<GetCareworkersResponseDto> {
    // socialWorker 권한 체크
    if (req.user.role !== 'socialWorker') {
      throw new ForbiddenException(
        '사회복지사만 요양보호사 목록을 조회할 수 있습니다.',
      );
    }

    return {
      success: true,
      data: await this.careworkerService.getCareworkers(),
    };
  }

  @ApiOperation({
    summary: '이번 주 근무 데이터 조회',
    description: '이번 주 월요일부터 오늘까지의 work 데이터를 조회합니다.',
  })
  @ApiQuery({
    name: 'careworkerId',
    required: false,
    description: '특정 요양보호사 ID (선택사항)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: '이번 주 근무 데이터 조회 성공',
    type: GetThisWeekWorksResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @Get('works/this-week')
  async getThisWeekWorks(
    @Query() query: GetThisWeekWorksQueryDto,
  ): Promise<GetThisWeekWorksResponseDto> {
    const parsedCareworkerId = query.careworkerId
      ? parseInt(query.careworkerId, 10)
      : undefined;

    return {
      success: true,
      data: await this.careworkerService.getThisWeekWorks(parsedCareworkerId),
    };
  }

  @ApiOperation({
    summary: '기간별 근무 데이터 조회',
    description:
      '현재 로그인한 요양보호사의 지정한 기간의 work 데이터를 조회합니다.',
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
  @ApiResponse({
    status: 200,
    description: '기간별 근무 데이터 조회 성공',
    type: GetWorksByDateRangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 날짜 형식 또는 날짜 범위',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @Get('works/date-range')
  async getWorksByDateRange(
    @Query() query: GetWorksByDateRangeQueryDto,
    @Request() req,
  ): Promise<GetWorksByDateRangeResponseDto> {
    const parsedStartDate = new Date(query.startDate);
    const parsedEndDate = new Date(query.endDate);

    // 날짜 유효성 검사
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return {
        success: false,
        message: '유효하지 않은 날짜 형식입니다.',
      };
    }

    if (parsedStartDate > parsedEndDate) {
      return {
        success: false,
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
      };
    }

    return {
      success: true,
      data: await this.careworkerService.getWorksByDateRange(
        parsedStartDate,
        parsedEndDate,
        req.user.id,
      ),
    };
  }
}
