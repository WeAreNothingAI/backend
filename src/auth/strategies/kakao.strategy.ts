import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // .env.local 파일에서 직접 설정 읽기
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    let localRedirectUri: string | null = null;

    if (fs.existsSync(envLocalPath)) {
      const envLocalConfig = dotenv.parse(fs.readFileSync(envLocalPath));
      localRedirectUri = envLocalConfig.KAKAO_REDIRECT_URI;
    }

    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const configRedirectUri = configService.get<string>('KAKAO_REDIRECT_URI');

    // localRedirectUri가 있으면 우선 사용, 없으면 configRedirectUri 사용, 그것도 없으면 기본값 사용
    const callbackURL =
      localRedirectUri ||
      configRedirectUri ||
      'http://localhost:3000/auth/kakao/callback';

    super({
      clientID,
      callbackURL,
      session: false,
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
