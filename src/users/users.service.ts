import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Member, SocialPlatform, Role } from '@prisma/client';

export interface SocialUserInfo {
  platformId: string;
  platform: SocialPlatform;
  email: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number): Promise<Member | null> {
    return this.prisma.member.findUnique({
      where: { id },
      include: {
        socialAccounts: true,
      },
    });
  }

  async findByEmail(email: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: { email },
      include: {
        socialAccounts: true,
      },
    });
  }

  async findBySocialAccount(
    platform: SocialPlatform,
    platformId: string,
  ): Promise<Member | null> {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        platform_platformId: {
          platform,
          platformId,
        },
      },
      include: {
        member: {
          include: {
            socialAccounts: true,
          },
        },
      },
    });

    return socialAccount?.member || null;
  }

  async createUserWithSocialAccount(userInfo: SocialUserInfo): Promise<Member> {
    return this.prisma.member.create({
      data: {
        email: userInfo.email,
        name: userInfo.name,
        password: '', // 소셜 로그인은 비밀번호 불필요
        role: 'careWorker', // 임시 역할 설정 (회원가입 완료 시 실제 역할로 업데이트)
        socialAccounts: {
          create: {
            platform: userInfo.platform,
            platformId: userInfo.platformId,
          },
        },
      },
      include: {
        socialAccounts: true,
      },
    });
  }

  async linkSocialAccount(
    memberId: number,
    userInfo: SocialUserInfo,
  ): Promise<Member | null> {
    await this.prisma.socialAccount.create({
      data: {
        memberId,
        platform: userInfo.platform,
        platformId: userInfo.platformId,
      },
    });

    return this.findById(memberId);
  }

  async deleteUser(userId: number): Promise<void> {
    // 소셜 계정 먼저 삭제
    await this.prisma.socialAccount.deleteMany({
      where: { memberId: userId },
    });

    // 사용자 삭제
    await this.prisma.member.delete({
      where: { id: userId },
    });
  }

  async updateUserRole(userId: number, role: Role): Promise<Member> {
    return this.prisma.member.update({
      where: { id: userId },
      data: { role },
    });
  }
}
