import { ApiProperty } from '@nestjs/swagger';

export class JournalListItemDto {
  @ApiProperty({ example: 1, description: '일지 ID' })
  id: number;

  @ApiProperty({ example: '2025-05-26T04:43:53.853Z', description: '생성일자' })
  createdAt: string;

  @ApiProperty({ example: '대상자님은 2025년 5월 26일에 상담사와 상담을 진행하고 계십니다.', description: '상담 요약' })
  summary: string;
} 