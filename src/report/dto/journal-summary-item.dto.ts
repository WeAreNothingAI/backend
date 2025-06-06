import { ApiProperty } from '@nestjs/swagger';

export class JournalSummaryItemDto {
  @ApiProperty({ example: '2025-05-25' })
  date: string;
  @ApiProperty({ example: '김난영' })
  careWorker: string;
  @ApiProperty({ example: '가사 지원, 상담' })
  service: string;
  @ApiProperty({ example: '신체 불편과 밤 통증...' })
  notes: string;
} 