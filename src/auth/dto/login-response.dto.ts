import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT 액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 리프레시 토큰' })
  refreshToken: string;

  @ApiProperty({
    description: '신규 가입 여부. true이면 역할(role) 선택이 필요합니다.',
  })
  isNewUser: boolean;
}
