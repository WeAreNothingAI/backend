import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Member, Work, Role } from '@prisma/client';

@Injectable()
export class CareworkerService {
  constructor(private prisma: PrismaService) {}

  // 1. role이 careworker인 멤버들 리스트 조회
  async getCareworkers() {
    return this.prisma.member.findMany({
      where: {
        role: Role.careWorker,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // 2-1. 이번 주 월요일부터 오늘까지의 work 데이터 조회
  async getThisWeekWorks(careworkerId?: number) {
    const today = new Date();
    const monday = this.getMondayOfWeek(today);

    const whereClause: any = {
      workDate: {
        gte: monday,
        lte: today,
      },
    };

    if (careworkerId) {
      whereClause.memberId = careworkerId;
    } else {
      // role이 careworker인 멤버들의 work만 조회
      whereClause.member = {
        role: Role.careWorker,
        deletedAt: null,
      };
    }

    const works = await this.prisma.work.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        events: {
          orderBy: {
            workTime: 'asc',
          },
        },
      },
      orderBy: {
        workDate: 'desc',
      },
    });

    return works.map((work) => ({
      id: work.id,
      memberId: work.memberId,
      workDate: work.workDate,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
      member: work.member,
      events: work.events,
    }));
  }

  // 2-2. 사용자가 지정한 기간의 work 데이터 조회 (현재 로그인한 요양보호사만)
  async getWorksByDateRange(
    startDate: Date,
    endDate: Date,
    careworkerId: number,
  ) {
    const works = await this.prisma.work.findMany({
      where: {
        workDate: {
          gte: startDate,
          lte: endDate,
        },
        memberId: careworkerId,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        events: {
          orderBy: {
            workTime: 'asc',
          },
        },
      },
      orderBy: {
        workDate: 'desc',
      },
    });

    return works.map((work) => ({
      id: work.id,
      memberId: work.memberId,
      workDate: work.workDate,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
      member: work.member,
      events: work.events,
    }));
  }

  // 이번 주 월요일 날짜 계산 헬퍼 함수
  private getMondayOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일이 1, 일요일이 0
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
