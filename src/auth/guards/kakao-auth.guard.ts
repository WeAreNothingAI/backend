import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
  constructor() {
    // 세션을 사용하지 않고, 컨트롤러로 user 객체만 넘기도록 설정
    super({ session: false });
  }

  canActivate(context) {
    const result = super.canActivate(context);
    return result;
  }

  handleRequest(err, user, info, context) {
    if (err || !user) {
      return null;
    }
    // 리다이렉트 없이 user 객체만 컨트롤러로 전달
    return user;
  }
}
