import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateWeeklyReportFlexibleDto } from './dto/create-weekly-report-flexible.dto';
import { CreateWeeklyReportResponseDto } from './dto/create-weekly-report-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStringFields } from 'src/journal/normalize-string-fields';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { DownloadUrlResponseDto } from '../journal/dto/download-url-response.dto';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReportDto) {
    // 1. FastAPI 호출
    const { data } = await axios.post(
      'http://python.service:5000/generate-journal-docx',
      {
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
        note: dto.note,
      },
    );

    if (!data) {
      throw new Error('python-report 서버에서 유효한 응답을 받지 못했습니다.');
    }

    // FastAPI 결과만 반환
    return data;
  }

  /**
   * [내부 전용] 단일 어르신 주간보고서 생성
   * - 반드시 clientId가 필요함 (자동 그룹핑된 각 어르신별로만 호출)
   * - 외부 API에서는 직접 호출하지 않음
   */
  async createWeeklyReport(dto: CreateWeeklyReportFlexibleDto, user): Promise<CreateWeeklyReportResponseDto> {
    console.log('[SERVICE] createWeeklyReport 진입, dto.journalIds:', dto.journalIds);
    // 디버깅: 파라미터 출력
    console.log('[DEBUG] createWeeklyReport 파라미터:', JSON.stringify(dto));
    const nowKST = dayjs().tz('Asia/Seoul');
    let journals;
    let periodStart = dto.periodStart;
    let periodEnd = dto.periodEnd;
    let clientId = dto.clientId;

    if (periodStart && periodEnd) {
      const start = dayjs(periodStart);
      const end = dayjs(periodEnd);
      if (end.diff(start, 'day') > 6) {
        console.error('[LOG] 기간 7일 초과 에러');
        throw new BadRequestException('기간은 최대 7일(1주일)까지만 선택할 수 있습니다.');
      }
    }

    try {
      if (Array.isArray(dto.journalIds) && dto.journalIds.length > 0) {
        console.log('[LOG] journalIds로 분기');
        journals = await this.prisma.journal.findMany({
          where: { id: { in: dto.journalIds } },
          include: { careWorker: true },
        });
        console.log('[DEBUG] journalIds로 조회된 일지:', journals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
        if (!journals || journals.length === 0) {
          console.error('[LOG] journalIds 조건에 맞는 일지 없음');
          throw new NotFoundException('조건에 맞는 일지가 없습니다.');
        }
        // createdAt 기준 정렬 및 기간 보정
        if (dto.periodStart && dto.periodEnd) {
          const periodStartUtc = dayjs.tz(dto.periodStart, 'Asia/Seoul').startOf('day').utc();
          const periodEndUtc = dayjs.tz(dto.periodEnd, 'Asia/Seoul').endOf('day').utc();
          console.log('[DEBUG] periodStartUtc:', periodStartUtc.format(), 'periodEndUtc:', periodEndUtc.format());
          journals = journals.filter(j => {
            const createdAt = dayjs(j.createdAt);
            const result = createdAt.isSameOrAfter(periodStartUtc) && createdAt.isSameOrBefore(periodEndUtc);
            if (!result) {
              console.log(`[DEBUG] 필터링 제외됨: id=${j.id}, createdAt=${createdAt.format()}, periodStartUtc=${periodStartUtc.format()}, periodEndUtc=${periodEndUtc.format()}`);
            }
            return result;
          });
        }
        console.log('[DEBUG] 기간 필터링 후 일지:', journals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
        journals = journals.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        console.log('[DEBUG] 정렬 후 일지:', journals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
        if (!journals || journals.length === 0) {
          console.error('[LOG] journalIds+기간 조건에 맞는 일지 없음');
          throw new NotFoundException('조건에 맞는 일지가 없습니다.');
        }
        clientId = journals[0]?.clientId;
        periodStart = journals[0]?.createdAt.toISOString().slice(0, 10);
        periodEnd = journals[journals.length-1]?.createdAt.toISOString().slice(0, 10);
      } else if (dto.periodStart && dto.periodEnd && dto.clientId) {
        const periodStartUtc = dayjs.tz(dto.periodStart, 'Asia/Seoul').startOf('day').utc().toDate();
        const periodEndUtc = dayjs.tz(dto.periodEnd, 'Asia/Seoul').endOf('day').utc().toDate();
        journals = await this.prisma.journal.findMany({
          where: {
            createdAt: {
              gte: periodStartUtc,
              lte: periodEndUtc, // 마지막 날짜 23:59:59까지 포함
            },
            clientId: dto.clientId,
          },
          orderBy: { createdAt: 'desc' },
          include: { careWorker: true },
        });
        if (!journals || journals.length === 0) {
          console.error('[LOG] 기간+clientId 조건에 맞는 일지 없음');
          throw new NotFoundException('조건에 맞는 일지가 없습니다.');
        }
      } else {
        console.error('[LOG] 분기 실패: journalIds/기간+clientId 둘 다 없음');
        throw new BadRequestException('journalIds 또는 기간+clientId 중 하나는 필수입니다.');
      }
    } catch (err) {
      console.error('[LOG] createWeeklyReport 내부 에러:', err);
      throw err;
    }
    if (!journals || journals.length === 0) {
      console.error('[LOG] 최종적으로 선택된 일지 없음');
      throw new Error('선택된 기간/조건에 해당하는 일지가 없습니다.');
    }
    console.log('[DEBUG] 최종 보고서에 들어가는 일지:', journals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
    const journalSummary = journals.map(j => ({
      date: j.createdAt.toISOString().slice(0, 10),
      careWorker: j.careWorker?.name ?? '',
      service: j.transcript ?? '',
      notes: j.summary ?? j.note ?? '',
    }));
    // 어르신/복지사 정보 조회
    const client = clientId
      ? await this.prisma.client.findUnique({ where: { id: clientId } })
      : null;
    const socialWorker = user?.id
      ? await this.prisma.member.findUnique({ where: { id: user.id } })
      : null;
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
        periodStart: periodStart
          ? new Date(periodStart)
          : journals[0]?.createdAt,
        periodEnd: periodEnd
          ? new Date(periodEnd)
          : journals[journals.length - 1]?.createdAt,
        careWorkerId: journals[0]?.careWorkerId ?? 0,
        socialWorkerId: user.id,
        createdAt: nowKST.toDate(),
      },
    });

    const reportDate = nowKST.format('YYYY-MM-DD');
    // FastAPI에 전달 (기본 정보 포함)
    const fastApiPayload = {
      journalSummary,
      periodStart,
      periodEnd,
      clientName: client?.name ?? '',
      birthDate: client?.birthDate
        ? client.birthDate.toISOString().slice(0, 10)
        : '',
      guardianContact: client?.guardianContact ?? '',
      reportDate,
      socialWorkerName: socialWorker?.name ?? '',
    };
    let data: Record<string, any>;
    try {
      const response = await axios.post(
        'http://python.service:5000/generate-weekly-report/',
        fastApiPayload,
        { timeout: 600000 },
      );
      data = response.data as Record<string, any>;
    } catch (error: any) {
      if (error.response && error.response.data) {
        console.error('FastAPI 응답 에러:', error.response.data);
      } else {
        console.error('FastAPI 요청 에러:', error.message);
      }
      throw error;
    }
    // DB 업데이트 (GPT 결과 반영)
    await this.prisma.report.update({
      where: { id: report.id },
      data: {
        title: data!.title ?? '',
        careLevel: data!.careLevel ?? '',
        journalSummary: journalSummary,
        summary: data!.summary ?? '',
        riskNotes: data!.riskNotes ?? '',
        evaluation: data!.evaluation ?? '',
        suggestion: data!.suggestion ?? '',
        exportedPdf: data!.pdf_url ?? '',
        exportedDocx: data!.docx_url ?? '',
      },
    });
    // file: docx_url에서 파일명만 추출
    let file = '';
    if (data!.docx_url) {
      const parts = data!.docx_url.split('/');
      file = parts[parts.length - 1];
    }
    return normalizeStringFields({
      file,
      docx_url: data!.docx_url ?? '',
      pdf_url: data!.pdf_url ?? '',
      title: data!.title ?? '',
      clientName: client?.name ?? '',
      birthDate: client?.birthDate
        ? client.birthDate.toISOString().slice(0, 10)
        : '',
      careLevel: data!.careLevel ?? '',
      guardianContact: client?.guardianContact ?? '',
      reportDate,
      socialWorkerName: socialWorker?.name ?? '',
      summary: data!.summary ?? '',
      riskNotes: data!.riskNotes ?? '',
      evaluation: data!.evaluation ?? '',
      suggestion: data!.suggestion ?? '',
    }) as CreateWeeklyReportResponseDto;
  }

  async findWeeklyReport(id: string): Promise<CreateWeeklyReportResponseDto> {
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
      birthDate: report.client
        ? report.client.birthDate
          ? report.client.birthDate.toISOString().slice(0, 10)
          : ''
        : '',
      careLevel: report.careLevel ?? '',
      guardianContact: report.client
        ? (report.client.guardianContact ?? '')
        : '',
      reportDate: report.periodEnd
        ? report.periodEnd.toISOString().slice(0, 10)
        : '',
      socialWorkerName: report.socialWorker ? report.socialWorker.name : '',
      summary: report.summary ?? '',
      riskNotes: report.riskNotes ?? '',
      evaluation: report.evaluation ?? '',
      suggestion: report.suggestion ?? '',
    }) as CreateWeeklyReportResponseDto;
  }

  /**
   * [외부 API용] 복지사 담당 어르신별 자동 그룹핑 주간보고서 생성
   * - 프론트/외부에서는 기간만 보내면 됨 (clientId 필요 없음)
   * - 내부적으로 어르신별로 그룹핑 후 createWeeklyReport를 호출
   */
  async createWeeklyReportsGrouped(
    dto: {
      journalIds?: number[];
      periodStart?: string;
      periodEnd?: string;
      clientId?: number;
    },
    user,
  ): Promise<CreateWeeklyReportResponseDto[]> {
    console.log('[SERVICE] createWeeklyReportsGrouped 진입, dto.journalIds:', dto.journalIds);
    // 디버깅: 파라미터 출력
    console.log('[DEBUG] createWeeklyReportsGrouped 파라미터:', JSON.stringify(dto));
    if (dto.periodStart && dto.periodEnd) {
      const start = dayjs(dto.periodStart);
      const end = dayjs(dto.periodEnd);
      if (end.diff(start, 'day') > 6) {
        throw new BadRequestException(
          '기간은 최대 7일(1주일)까지만 선택할 수 있습니다.',
        );
      }
    }
    let journals: any[] = [];
    if (dto.journalIds && dto.journalIds.length > 0) {
      journals = await this.prisma.journal.findMany({
        where: { id: { in: dto.journalIds } },
        include: { careWorker: true, client: true },
      });
      if (!journals || journals.length === 0) {
        throw new NotFoundException('조건에 맞는 일지가 없습니다.');
      }
    } else if (dto.periodStart && dto.periodEnd) {
      // KST → UTC 변환 적용
      const periodStartUtc = dayjs.tz(dto.periodStart, 'Asia/Seoul').startOf('day').utc().toDate();
      const periodEndUtc = dayjs.tz(dto.periodEnd, 'Asia/Seoul').endOf('day').utc().toDate();
      console.log('[DEBUG] 그룹핑용 periodStartUtc:', periodStartUtc, 'periodEndUtc:', periodEndUtc);
      journals = await this.prisma.journal.findMany({
        where: {
          createdAt: {
            gte: periodStartUtc,
            lte: periodEndUtc,
          },
        },
        include: { careWorker: true, client: true },
      });
      console.log('[DEBUG] 기간 내 전체 일지:', journals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
      if (!journals || journals.length === 0) {
        throw new NotFoundException('조건에 맞는 일지가 없습니다.');
      }
      // [추가] 월~금(평일)만 필터링
      journals = journals.filter(j => {
        const day = dayjs(j.createdAt).tz('Asia/Seoul').day(); // 0:일, 1:월, ..., 5:금, 6:토
        return day >= 1 && day <= 5;
      });
      if (!journals || journals.length === 0) {
        throw new NotFoundException('기간 내 평일(월~금) 일지가 없습니다.');
      }
    } else {
      throw new BadRequestException(
        'journalIds 또는 기간 중 하나는 필수입니다.',
      );
    }
    // 복지사 담당 어르신만 필터링
    const filteredJournals = journals.filter(j => j.client?.socialWorkerId === user.id);
    console.log('[DEBUG] 복지사 담당 어르신 일지:', filteredJournals.map(j => ({ id: j.id, createdAt: j.createdAt, clientId: j.clientId })));
    if (filteredJournals.length === 0) {
      throw new ForbiddenException(
        '복지사가 담당하는 어르신의 일지가 없습니다.',
      );
    }
    // 어르신별 그룹화
    const grouped = new Map<number, any[]>();
    for (const j of filteredJournals) {
      if (!grouped.has(j.clientId)) grouped.set(j.clientId, []);
      grouped.get(j.clientId)!.push(j);
    }
    // 그룹핑 후 로그
    for (const [clientId, clientJournals] of grouped.entries()) {
      console.log(`[DEBUG] 그룹핑 후 clientId: ${clientId}, 일지 개수: ${clientJournals.length}, 일지 id: ${clientJournals.map(j => j.id)}`);
    }
    // 각 어르신별로 모든 일지로 주간보고서 생성 (제한 없음)
    const results: CreateWeeklyReportResponseDto[] = [];
    for (const [clientId, clientJournals] of grouped.entries()) {
      const sortedJournals = clientJournals.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      if (sortedJournals.length === 0) continue;
      const periodStart = sortedJournals[0].createdAt
        .toISOString()
        .slice(0, 10);
      const periodEnd = sortedJournals[sortedJournals.length - 1].createdAt
        .toISOString()
        .slice(0, 10);
      const res = await this.createWeeklyReport(
        {
          journalIds: sortedJournals.map((j) => j.id),
          clientId,
          periodStart,
          periodEnd,
        },
        user,
      );
      results.push(res);
    }
    if (results.length === 0) {
      throw new NotFoundException(
        '조건에 맞는 주간보고서를 생성할 수 없습니다.',
      );
    }
    return results;
  }

  async findWeeklyReportDocxPresignedUrl(
    id: number,
  ): Promise<DownloadUrlResponseDto> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || !report.exportedDocx)
      throw new NotFoundException('docx 파일이 존재하지 않습니다.');
    let fileName = report.exportedDocx as string;
    if (fileName.includes('/')) fileName = fileName.split('/').pop() as string;
    try {
      const { data } = await axios.post(
        'http://python.service:5000/generate-weekly-report/download-weekly-docx-url',
        { file_name: fileName },
        { timeout: 10000 },
      );
      return data as DownloadUrlResponseDto;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        throw new NotFoundException('docx 파일이 존재하지 않습니다.');
      }
      throw new Error('presigned url 생성 중 서버 오류');
    }
  }

  async findWeeklyReportPdfPresignedUrl(
    id: number,
  ): Promise<DownloadUrlResponseDto> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || !report.exportedPdf)
      throw new NotFoundException('pdf 파일이 존재하지 않습니다.');
    let fileName = report.exportedPdf as string;
    if (fileName.includes('/')) fileName = fileName.split('/').pop() as string;
    try {
      const { data } = await axios.post(
        'http://python.service:5000/generate-weekly-report/download-weekly-pdf-url',
        { file_name: fileName },
        { timeout: 10000 },
      );
      return data as DownloadUrlResponseDto;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        throw new NotFoundException('pdf 파일이 존재하지 않습니다.');
      }
      throw new Error('presigned url 생성 중 서버 오류');
    }
  }
}
