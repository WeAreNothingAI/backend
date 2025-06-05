import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CompleteSignupDto {
  @ApiProperty({
    enum: Role,
    description:
      '사용자 역할 (careWorker: 요양보호사, socialWorker: 사회복지사)',
    example: 'careWorker',
  })
  @IsEnum(Role)
  role: Role;
}
