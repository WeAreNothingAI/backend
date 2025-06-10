import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetThisWeekWorksQueryDto {
  @ApiProperty({
    description: '특정 요양보호사 ID (선택사항)',
    required: false,
    example: '1',
  })
  @IsOptional()
  @IsString()
  careworkerId?: string;
}

export class GetThisWeekWorksResponseDto {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '이번 주 근무 데이터 목록',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        memberId: { type: 'number', example: 1 },
        workDate: { type: 'string', format: 'date', example: '2024-01-15' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T00:00:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T00:00:00.000Z',
        },
        member: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: '김요양' },
            email: { type: 'string', example: 'careworker@example.com' },
          },
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              workId: { type: 'number', example: 1 },
              type: { type: 'string', example: 'CLOCK_IN' },
              workTime: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
            },
          },
        },
      },
    },
  })
  data: {
    id: number;
    memberId: number;
    workDate: Date;
    createdAt: Date;
    updatedAt: Date;
    member: {
      id: number;
      name: string;
      email: string;
    };
    events: {
      id: number;
      workId: number;
      type: string;
      workTime: Date;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }[];
}

export class GetWorksByDateRangeQueryDto {
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
}

export class GetWorksByDateRangeResponseDto {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '기간별 근무 데이터 목록',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        memberId: { type: 'number', example: 1 },
        workDate: { type: 'string', format: 'date', example: '2024-01-15' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T00:00:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T00:00:00.000Z',
        },
        member: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: '김요양' },
            email: { type: 'string', example: 'careworker@example.com' },
          },
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              workId: { type: 'number', example: 1 },
              type: { type: 'string', example: 'CLOCK_IN' },
              workTime: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T09:00:00.000Z',
              },
            },
          },
        },
      },
    },
  })
  data?: {
    id: number;
    memberId: number;
    workDate: Date;
    createdAt: Date;
    updatedAt: Date;
    member: {
      id: number;
      name: string;
      email: string;
    };
    events: {
      id: number;
      workId: number;
      type: string;
      workTime: Date;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }[];

  @ApiProperty({
    description: '에러 메시지',
    required: false,
    example: '유효하지 않은 날짜 형식입니다.',
  })
  message?: string;
}
