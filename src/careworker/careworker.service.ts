import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Member, Work, Journal, Role } from '@prisma/client';

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

  // 2-2. 사용자가 지정한 기간의 work 데이터 조회
  async getWorksByDateRange(
    startDate: Date,
    endDate: Date,
    careworkerId?: number,
  ) {
    const whereClause: any = {
      workDate: {
        gte: startDate,
        lte: endDate,
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

  // 3-1. 특정 careworker의 일지 목록 조회 (개별 일지, createdAt 오름차순)
  async getCareworkerJournalList(careworkerId: number) {
    const journals = await this.prisma.journal.findMany({
      where: {
        careWorkerId: careworkerId,
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 각 일지를 개별적으로 반환 (날짜별 그룹화 없음)
    return journals.map((journal) => ({
      date: journal.createdAt.toISOString().split('T')[0], // YYYY-MM-DD 형식
      journalId: journal.id,
      createdAt: journal.createdAt,
    }));
  }

  // 3-2. 특정 journal 상세조회
  async getJournalDetail(journalId: number) {
    const journal = await this.prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      include: {
        careWorker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!journal) {
      return null;
    }

    return {
      id: journal.id,
      careWorkerId: journal.careWorkerId,
      clientId: journal.clientId,
      rawAudioUrl: journal.rawAudioUrl,
      transcript: journal.transcript,
      summary: journal.summary,
      recommendations: journal.recommendations,
      opinion: journal.opinion,
      result: journal.result,
      note: journal.note,
      exportedPdf: journal.exportedPdf,
      exportedDocx: journal.exportedDocx,
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      careWorker: journal.careWorker,
    };
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
