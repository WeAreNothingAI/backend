import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateWorkDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  clientId: number;
}
