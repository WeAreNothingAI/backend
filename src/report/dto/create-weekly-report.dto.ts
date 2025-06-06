import { ApiProperty } from '@nestjs/swagger';

export class JournalSummaryDto {
  @ApiProperty({ description: '일지 날짜 (YYYY-MM-DD)', example: '2025-05-25' })
  date: string;

  @ApiProperty({ description: '요양보호사 이름', example: '홍길동' })
  careWorker: string;

  @ApiProperty({ description: '서비스 내용', example: '가사 지원, 상담' })
  service: string;

  @ApiProperty({ description: '특이사항/비고', example: '신체 불편과 밤 통증...' })
  notes: string;
}

export class CreateWeeklyReportDto {
  @ApiProperty({ description: '일지 id 배열 (최대 5개)', example: [1,2,3,4,5] })
  journalIds: number[];
} 