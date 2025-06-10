import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCareworkersResponseDto {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '요양보호사 목록',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        email: { type: 'string', example: 'careworker@example.com' },
        name: { type: 'string', example: '김요양' },
        role: { type: 'string', example: 'careWorker' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  data: {
    id: number;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

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

  @ApiProperty({
    description: '특정 요양보호사 ID (선택사항)',
    required: false,
    example: '1',
  })
  @IsOptional()
  @IsString()
  careworkerId?: string;
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

export class GetCareworkerJournalListParamDto {
  @ApiProperty({
    description: '요양보호사 ID',
    example: 1,
  })
  @IsNumber()
  careworkerId: number;
}

export class GetCareworkerJournalListResponseDto {
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

export class GetJournalDetailQueryDto {
  @ApiProperty({
    description: '일지 ID',
    example: 1,
  })
  @IsNumber()
  journalId: number;
}

export class GetJournalDetailResponseDto {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '일지 상세 정보',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        careWorkerId: { type: 'number', example: 1 },
        clientId: { type: 'number', example: 1 },
        rawAudioUrl: {
          type: 'string',
          example: 'https://example.com/audio.mp3',
        },
        transcript: {
          type: 'string',
          example: '오늘은 환자가 좋아 보였습니다...',
        },
        summary: { type: 'string', example: '환자 상태 양호', nullable: true },
        recommendations: {
          type: 'string',
          example: '규칙적인 운동 권장',
          nullable: true,
        },
        opinion: {
          type: 'string',
          example: '전반적으로 양호한 상태',
          nullable: true,
        },
        result: {
          type: 'string',
          example: '치료 효과가 나타나고 있음',
          nullable: true,
        },
        note: { type: 'string', example: '추가 관찰 필요', nullable: true },
        exportedPdf: {
          type: 'string',
          example: 'https://example.com/report.pdf',
          nullable: true,
        },
        exportedDocx: {
          type: 'string',
          example: 'https://example.com/report.docx',
          nullable: true,
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
        careWorker: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: '김요양' },
            email: { type: 'string', example: 'careworker@example.com' },
          },
        },
      },
    },
  })
  data?: {
    id: number;
    careWorkerId: number;
    clientId: number;
    rawAudioUrl: string;
    transcript: string;
    summary: string | null;
    recommendations: string | null;
    opinion: string | null;
    result: string | null;
    note: string | null;
    exportedPdf: string | null;
    exportedDocx: string | null;
    createdAt: Date;
    updatedAt: Date;
    careWorker: {
      id: number;
      name: string;
      email: string;
    };
  };

  @ApiProperty({
    description: '에러 메시지',
    required: false,
    example: '일지를 찾을 수 없습니다.',
  })
  message?: string;
}
