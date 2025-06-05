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
