import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async createClient(data: CreateClientDto, socialWorkerId: number) {
    const { birthDate, gender, careWorkerId, ...otherData } = data;

    if (gender !== '여' && gender !== '남') {
      throw new BadRequestException('성별은 `여` 또는 `남`만 가능합니다.');
    }

    const parsedDate = new Date(birthDate);

    if (!careWorkerId) {
      throw new BadRequestException('careWorkerId는 필수입니다.');
    }

    return await this.prisma.client.create({
      data: {
        gender,
        ...otherData,
        birthDate: parsedDate,
        socialWorkerId,
        careWorkerId,
      },
    });
  }

  async findManyClient({
    socialWorkerId,
    careWorkerId,
  }: {
    socialWorkerId?: number;
    careWorkerId?: number;
  }) {
    // KST → UTC 변환된 오늘 날짜 범위 계산
    const now = new Date();
    const kstOffsetMinutes = -9 * 60;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const kstNow = new Date(utcTime + -kstOffsetMinutes * 60000);

    const year = kstNow.getFullYear();
    const month = kstNow.getMonth();
    const date = kstNow.getDate();

    const startOfKST = new Date(Date.UTC(year, month, date, 0, 0, 0));
    const endOfKST = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
    const todayDate = new Date(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T00:00:00`,
    );

    // 조건 처리 (복지사 또는 보호사 기준)
    const whereCondition =
      socialWorkerId !== undefined
        ? { socialWorkerId }
        : careWorkerId !== undefined
          ? { careWorkerId }
          : {};

    // 어르신 목록 + 오늘 일지 포함
    const clients = await this.prisma.client.findMany({
      where: whereCondition,
      include: {
        journals: {
          where: {
            createdAt: {
              gte: startOfKST,
              lte: endOfKST,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 보호사가 오늘 출근한 Work 목록 가져오기
    const works = careWorkerId
      ? await this.prisma.work.findMany({
          where: {
            memberId: careWorkerId,
            workDate: todayDate, // 'YYYY-MM-DD' 문자열
          },
          include: {
            client: true,
            events: {
              where: {
                type: 'CLOCK_IN',
                createdAt: {
                  gte: startOfKST,
                  lte: endOfKST,
                },
              },
            },
          },
        })
      : [];

    // clientId 기준으로 출근 여부 맵핑
    const clockInMap = new Map<number, boolean>();
    for (const work of works) {
      if (work.events.length > 0) {
        clockInMap.set(work.clientId, true);
      }
    }

    // 어르신별 정보 정리
    const results = clients.map((client) => {
      const hasClockedIn = clockInMap.get(client.id) || false;
      const journal = client.journals[0];

      return {
        clientId: client.id,
        clientName: client.name,
        attendance: hasClockedIn,
        schedule: client.planningTime || '-',
        journalStatus: journal ? '작성 완료' : '미작성',
      };
    });

    return results;
  }

  async findClient({
    id,
    socialWorkerId,
    careWorkerId,
  }: {
    id: number;
    socialWorkerId?: number;
    careWorkerId?: number;
  }) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException('해당 노인은 존재하지 않습니다.');
    }

    if (
      (socialWorkerId && client.socialWorkerId !== socialWorkerId) ||
      (careWorkerId && client.careWorkerId !== careWorkerId)
    ) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    return client;
  }
}
