import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService, SocialUserInfo } from '../users/users.service';
import { Member, Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TokenPair {
  @ApiProperty({ description: 'JWT 액세스 토큰' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 리프레시 토큰' })
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async validateKakaoUser(
    userInfo: SocialUserInfo,
  ): Promise<{ user: Member; isNewUser: boolean }> {
    // 기존 소셜 계정으로 사용자 찾기
    let user = await this.usersService.findBySocialAccount(
      userInfo.platform,
      userInfo.platformId,
    );

    if (user) {
      return { user, isNewUser: false };
    }

    // 이메일로 기존 사용자 찾기
    const existingUser = await this.usersService.findByEmail(userInfo.email);
    if (existingUser) {
      // 기존 사용자에 소셜 계정 연결
      user = await this.usersService.linkSocialAccount(
        existingUser.id,
        userInfo,
      );
      if (user) {
        return { user, isNewUser: false };
      }
    }

    // 새 사용자 생성
    user = await this.usersService.createUserWithSocialAccount(userInfo);
    return { user, isNewUser: true };
  }

  async generateTokens(user: Member): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const accessExpiration = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    const refreshExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessExpiration,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiration,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new Error('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async deleteAccount(userId: number): Promise<void> {
    await this.usersService.deleteUser(userId);
  }

  async completeSignup(userId: number, role: Role): Promise<Member> {
    return this.usersService.updateUserRole(userId, role);
  }
}
