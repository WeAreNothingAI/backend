import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info?.message === 'jwt expired') {
      throw new UnauthorizedException('토큰이 만료되었습니다.');
    }

    if (err || !user) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    return user;
  }
}
