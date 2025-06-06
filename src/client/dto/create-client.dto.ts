import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsDate,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2025-05-29' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planningTime: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contact?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  guardianContact?: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  careWorkerId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ClientListResponseDto {
  @ApiProperty({
    example: 1,
    description: '노인 ID',
  })
  clientId: number;

  @ApiProperty({
    example: '홍길동',
    description: '노인 이름',
  })
  clientName: string;

  @ApiProperty({
    example: true,
    description: '출근 여부',
  })
  attendance: string;

  @ApiProperty({
    example: 'PM 12:00 ~ PM 3:00',
    description: '계획 시간',
  })
  schedule: string;

  @ApiProperty({
    example: '미작성',
    description: '일지 작성 여부',
  })
  journalStatus: string;
}
