import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      callbackURL: configService.get<string>('KAKAO_REDIRECT_URI'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, _json } = profile;

    const userInfo = {
      platformId: String(id),
      platform: 'KAKAO' as const,
      email: _json.kakao_account?.email || `${id}@kakao.local`,
      name: _json.properties?.nickname || username || '카카오 사용자',
    };

    const { user, isNewUser } =
      await this.authService.validateKakaoUser(userInfo);
    return { ...user, isNewUser };
  }
}
