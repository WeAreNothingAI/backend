import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 주간보고서 생성(외부 API/내부 서비스)에서 모두 사용하는 DTO
 * - 외부: 기간만 보내거나, journalIds 배열을 보낼 때 사용
 * - 내부: 어르신별 주간보고서 생성 시 clientId, periodStart, periodEnd 등도 같이 넘김
 */
export class CreateWeeklyReportFlexibleDto {
  @ApiPropertyOptional({ description: '일지 id 배열 (최대 5개)', example: [1,2,3,4,5] })
  journalIds?: number[];

  @ApiPropertyOptional({ description: '기간 시작일 (YYYY-MM-DD)', example: '2025-05-01' })
  periodStart?: string;

  @ApiPropertyOptional({ description: '기간 종료일 (YYYY-MM-DD)', example: '2025-05-07' })
  periodEnd?: string;

  @ApiPropertyOptional({ description: '내부 호출 시: 어르신(클라이언트) id', example: 1 })
  clientId?: number;
}