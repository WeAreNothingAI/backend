import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  async createWorkIn(memberId: number, clientId: number) {
    const TYPE = 'CLOCK_IN';

    dayjs.extend(utc);
    dayjs.extend(timezone);

    // 한국 시간 기준으로 db에 저장
    const nowKST = dayjs().tz('Asia/Seoul');
    const workDate = new Date(
      dayjs().tz('Asia/Seoul').format('YYYY-MM-DDT00:00:00+09:00'),
    );
    const workTime = nowKST.format('HH:mm:ss');

    // string => Date(한국 시간 기준)
    const [hour, minute, second] = workTime.split(':').map(Number);
    const workTimeDate = new Date();
    workTimeDate.setHours(hour + 9, minute, second, 0);

    return await this.prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: { memberId, workDate, clientId },
      });

      await tx.workEvent.create({
        data: { workId: work.id, type: TYPE, workTime: workTimeDate },
      });
    });
  }

  async createWorkOut(memberId: number, clientId: number) {
    const TYPE = 'CLOCK_OUT';

    dayjs.extend(utc);
    dayjs.extend(timezone);

    // 한국 시간 기준으로 db에 저장
    const nowKST = dayjs().tz('Asia/Seoul');
    const workDate = nowKST.toDate();
    const workTime = nowKST.format('HH:mm:ss');

    // string => Date(한국 시간 기준)
    const [hour, minute, second] = workTime.split(':').map(Number);
    const workTimeDate = new Date();
    workTimeDate.setHours(hour + 9, minute, second, 0);

    return await this.prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: { memberId, workDate, clientId },
      });

      await tx.workEvent.create({
        data: { workId: work.id, type: TYPE, workTime: workTimeDate },
      });
    });
  }
}
