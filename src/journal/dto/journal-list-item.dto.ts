import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class JournalListItemDto {
  @ApiProperty({ example: 1, description: '일지 ID' })
  id: number;

  @ApiProperty({ example: '2025-05-26T04:43:53.853Z', description: '생성일자' })
  createdAt: Date;
}

export class GetJournalListByDateRangeQueryDto {
  @ApiProperty({
    description: '시작 날짜 (YYYY-MM-DD 형식)',
    example: '2024-01-01',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    description: '종료 날짜 (YYYY-MM-DD 형식)',
    example: '2024-01-31',
  })
  @IsString()
  endDate: string;

  @ApiProperty({
    description: '요양보호사 ID',
    example: 1,
  })
  @IsNumber()
  careworkerId: number;
}

export class GetJournalListByDateRangeResponseDto {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '일지 목록 (날짜, journalId, createdAt 포함)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2024-01-15' },
        journalId: { type: 'number', example: 1 },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T09:00:00.000Z',
        },
      },
    },
  })
  data: {
    date: string;
    journalId: number;
    createdAt: Date;
  }[];
}
