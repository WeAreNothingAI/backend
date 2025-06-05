import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateWeeklyReportFlexibleDto } from './dto/create-weekly-report-flexible.dto';
import { CreateWeeklyReportResponseDto } from './dto/create-weekly-report-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStringFields } from 'src/journal/normalize-string-fields';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReportDto) {
    // 1. FastAPI 호출
    const { data } = await axios.post('http://127.0.0.1:5000/generate-journal-docx', {
      text: dto.text,
      date: dto.date,
      service: dto.service,
      manager: dto.manager,
      method: dto.method,
      type: dto.type,
      time: dto.time,
      title: dto.title,
      category: dto.category,
      client: dto.client,
      contact: dto.contact,
      opinion: dto.opinion,
      result: dto.result,
      note: dto.note
    });

    if (!data) {
      throw new Error('python-report 서버에서 유효한 응답을 받지 못했습니다.');
    }

    // FastAPI 결과만 반환
    return data;
  }

  async createWeeklyReport(dto: CreateWeeklyReportFlexibleDto, user): Promise<CreateWeeklyReportResponseDto> {
  
    const nowKST = dayjs().tz('Asia/Seoul');
    let journals;
    let periodStart = dto.periodStart;
    let periodEnd = dto.periodEnd;
    let clientId = dto.clientId;
    if (dto.journalIds && dto.journalIds.length > 0) {
      if (dto.journalIds.length > 5) {
        throw new Error('최대 5개의 일지만 선택할 수 있습니다.');
      }
      journals = await this.prisma.journal.findMany({
        where: { id: { in: dto.journalIds } },
        include: { careWorker: true },
      });
      periodStart = journals[0]?.createdAt.toISOString().slice(0, 10);
      periodEnd = journals[journals.length-1]?.createdAt.toISOString().slice(0, 10);
      clientId = journals[0]?.clientId;
    } else if (dto.periodStart && dto.periodEnd && dto.clientId) {
      journals = await this.prisma.journal.findMany({
        where: {
          createdAt: {
            gte: new Date(dto.periodStart),
            lte: new Date(dto.periodEnd),
          },
          clientId: dto.clientId,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { careWorker: true },
      });
    } else {
      throw new Error('journalIds 또는 기간+clientId 중 하나는 필수입니다.');
    }
    if (!journals || journals.length === 0) {
      throw new Error('선택된 기간/조건에 해당하는 일지가 없습니다.');
    }
    const journalSummary = journals.map(j => ({
      date: j.createdAt.toISOString().slice(0, 10),
      careWorker: j.careWorker?.name ?? '',
      service: j.transcript ?? '',
      notes: j.summary ?? j.note ?? '',
    }));
    // 어르신/복지사 정보 조회
    const client = clientId ? await this.prisma.client.findUnique({ where: { id: clientId } }) : null;
    const socialWorker = user?.id ? await this.prisma.member.findUnique({ where: { id: user.id } }) : null;
    // DB 저장 (createdAt: 한국시간 기준)
    const report = await this.prisma.report.create({
      data: {
        title: '', // GPT가 생성
        clientId: clientId ?? 0,
        careLevel: '', // GPT가 생성
        journalSummary: journalSummary,
        summary: '', // GPT가 생성
        riskNotes: '', // GPT가 생성
        evaluation: '', // GPT가 생성
        suggestion: '', // GPT가 생성
        exportedPdf: '',
        exportedDocx: '',
        periodStart: periodStart ? new Date(periodStart) : journals[0]?.createdAt,
        periodEnd: periodEnd ? new Date(periodEnd) : journals[journals.length-1]?.createdAt,
        careWorkerId: journals[0]?.careWorkerId ?? 0,
        socialWorkerId: user.id,
        createdAt: nowKST.toDate(), // << 한국시간 명시적으로 지정
      }
    });
    // 보고서 작성일(한국시간)
    const reportDate = nowKST.format('YYYY-MM-DD');
    // FastAPI에 전달 (기본 정보 포함)
    const fastApiPayload = {
      journalSummary,
      periodStart,
      periodEnd,
      clientName: client?.name ?? '',
      birthDate: client?.birthDate ? client.birthDate.toISOString().slice(0, 10) : '',
      guardianContact: client?.guardianContact ?? '',
      reportDate,
      socialWorkerName: socialWorker?.name ?? '',
    };
    const { data }: { data: Record<string, any> } = await axios.post(
      'http://127.0.0.1:5000/generate-weekly-report',
      fastApiPayload,
      { timeout: 120000 }
    );
    // DB 업데이트 (GPT 결과 반영)
    await this.prisma.report.update({
      where: { id: report.id },
      data: {
        title: data.title ?? '',
        careLevel: data.careLevel ?? '',
        journalSummary: journalSummary,
        summary: data.summary ?? '',
        riskNotes: data.riskNotes ?? '',
        evaluation: data.evaluation ?? '',
        suggestion: data.suggestion ?? '',
        exportedPdf: data.pdf_url ?? '',
        exportedDocx: data.docx_url ?? '',
      }
    });
    // file: docx_url에서 파일명만 추출
    let file = '';
    if (data.docx_url) {
      const parts = data.docx_url.split('/');
      file = parts[parts.length - 1];
    }
    return normalizeStringFields({
      file,
      docx_url: data.docx_url ?? '',
      pdf_url: data.pdf_url ?? '',
      title: data.title ?? '',
      clientName: client?.name ?? '',
      birthDate: client?.birthDate ? client.birthDate.toISOString().slice(0, 10) : '',
      careLevel: data.careLevel ?? '',
      guardianContact: client?.guardianContact ?? '',
      reportDate,
      socialWorkerName: socialWorker?.name ?? '',
      summary: data.summary ?? '',
      riskNotes: data.riskNotes ?? '',
      evaluation: data.evaluation ?? '',
      suggestion: data.suggestion ?? '',
    }) as CreateWeeklyReportResponseDto;
  }

  async getWeeklyReportDetail(id: string): Promise<CreateWeeklyReportResponseDto> {
    // 실제 DB에서 id로 조회해서 반환
    const report = await this.prisma.report.findUnique({
      where: { id: Number(id) },
      include: {
        client: true,
        socialWorker: true,
      },
    });
    if (!report) {
      throw new NotFoundException('주간보고서를 찾을 수 없습니다.');
    }
    // file: docx_url에서 파일명만 추출
    const docxUrl = report.exportedDocx ?? '';
    let file = '';
    if (docxUrl) {
      const parts = docxUrl.split('/');
      file = parts[parts.length - 1];
    }
    return normalizeStringFields({
      file,
      docx_url: docxUrl,
      pdf_url: report.exportedPdf ?? '',
      title: report.title ?? '',
      clientName: report.client ? report.client.name : '',
      birthDate: report.client ? (report.client.birthDate ? report.client.birthDate.toISOString().slice(0, 10) : '') : '',
      careLevel: report.careLevel ?? '',
      guardianContact: report.client ? report.client.guardianContact ?? '' : '',
      reportDate: report.periodEnd ? report.periodEnd.toISOString().slice(0, 10) : '',
      socialWorkerName: report.socialWorker ? report.socialWorker.name : '',
      summary: report.summary ?? '',
      riskNotes: report.riskNotes ?? '',
      evaluation: report.evaluation ?? '',
      suggestion: report.suggestion ?? '',
    }) as CreateWeeklyReportResponseDto;
  }

  async createWeeklyReportsGrouped(
    dto: { journalIds?: number[]; periodStart?: string; periodEnd?: string; clientId?: number },
    user
  ): Promise<CreateWeeklyReportResponseDto[]> {
    let journals: any[] = [];
    if (dto.journalIds && dto.journalIds.length > 0) {
      journals = await this.prisma.journal.findMany({
        where: { id: { in: dto.journalIds } },
        include: { careWorker: true, client: true },
      });
    } else if (dto.periodStart && dto.periodEnd) {
      journals = await this.prisma.journal.findMany({
        where: {
          createdAt: {
            gte: new Date(dto.periodStart),
            lte: new Date(dto.periodEnd),
          },
        },
        include: { careWorker: true, client: true },
      });
    } else {
      throw new Error('journalIds 또는 기간 중 하나는 필수입니다.');
    }
    // 복지사 담당 어르신만 필터링
    journals = journals.filter(j => j.client?.socialWorkerId === user.id);
    // 어르신별 그룹화
    const grouped = new Map<number, any[]>();
    for (const j of journals) {
      if (!grouped.has(j.clientId)) grouped.set(j.clientId, []);
      grouped.get(j.clientId)!.push(j);
    }
    // 각 어르신별로 5개 이하 일지씩 주간보고서 생성
    const results: CreateWeeklyReportResponseDto[] = [];
    for (const [clientId, clientJournals] of grouped.entries()) {
      const top5 = clientJournals
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, 5);
      if (top5.length === 0) continue;
      const res = await this.createWeeklyReport(
        { journalIds: top5.map(j => j.id) },
        user,
      );
      results.push(res);
    }
    return results;
  }
}