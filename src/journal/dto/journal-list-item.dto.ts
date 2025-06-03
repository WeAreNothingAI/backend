import { ApiProperty } from '@nestjs/swagger';

export class JournalListItemDto {
  @ApiProperty({ example: 1, description: '일지 ID' })
  id: number;

  @ApiProperty({ example: '2025-05-26T04:43:53.853Z', description: '생성일자' })
  createdAt: Date;
} 