import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsNumber,
} from 'class-validator';

export class UpdateClientDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '2025-05-29', required: false })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  birthDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  planningTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contact?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guardianContact?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateClientByCareWorkerDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  careWorkerId: number;
}
