import { ApiProperty } from '@nestjs/swagger';
import { JournalSummaryItemDto } from './journal-summary-item.dto';

export class CreateWeeklyReportResponseDto {
  @ApiProperty({ example: "weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.docx" })
  file: string;

  @ApiProperty({ example: "https://oncare-backend.s3.amazonaws.com/weekly-report/docx/weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.docx" })
  docx_url: string;

  @ApiProperty({ example: "https://oncare-backend.s3.amazonaws.com/weekly-report/pdf/weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.pdf" })
  pdf_url: string;

  @ApiProperty({ example: "2025년 5월 4주차 요양보호 주간보고서" })
  title: string;

  @ApiProperty({ example: "김복자" })
  clientName: string;

  @ApiProperty({ example: "1934-01-22" })
  birthDate: string;

  @ApiProperty({ example: "3등급(추정)" })
  careLevel: string;

  @ApiProperty({ example: "010-2345-2345" })
  guardianContact: string;

  @ApiProperty({ example: "2025-06-06" })
  reportDate: string;

  @ApiProperty({ example: "김난영" })
  socialWorkerName: string;

  @ApiProperty({ example: "대상자께서는 최근 전반적인 신체 기능 저하로 가사활동에 큰 어려움을 겪고 계시며, 지속적인 요통 및 야간 통증으로 인해 삶의 질 저하를 호소하고 계십니다. 일상생활 전반에 불편이 있으셔서 방문 요양 및 돌봄 지원이 절실한 상태입니다." })
  summary: string;

  @ApiProperty({ example: "최근 대상자님께서는 야간 심한 통증과 신체적 불편함으로 인해 낙상 위험이 높으며, 가사활동 자체가 어려운 상황입니다. 또한, 통증 증상 악화로 의료적 지원과 함께 일상생활 전반의 관리가 필요합니다." })
  riskNotes: string;

  @ApiProperty({ example: "대상자님의 현재 건강 상태를 고려할 때 의료적 관리와 적극적인 가사 지원이 동반되어야 할 것으로 사료됩니다. 통증 호소가 심해 일상생활 활동 제한이 발생하므로, 정기적인 건강 체크 및 적시에 의료기관 진료를 받을 수 있도록 가족 및 보호자 협력이 필요합니다." })
  evaluation: string;

  @ApiProperty({ example: "정기적인 방문 요양 돌봄, 가사 지원 서비스 지속 제공, 통증 완화를 위한 전문 진료 동행, 필요시 보조기구 지원 등을 권고드립니다. 보호자께서는 대상자님의 야간 돌발상황 대처를 위해 연락체계를 구축해 주시기 바랍니다." })
  suggestion: string;

  @ApiProperty({ type: [JournalSummaryItemDto] })
  journalSummary: JournalSummaryItemDto[];
}

export const WEEKLY_REPORT_RESPONSE_EXAMPLE = [
  {
    file: "weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.docx",
    docx_url: "https://oncare-backend.s3.amazonaws.com/weekly-report/docx/weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.docx",
    pdf_url: "https://oncare-backend.s3.amazonaws.com/weekly-report/pdf/weekly-report-1f8f4465-30e8-4ed7-afe7-f10b66cacaf9.pdf",
    title: "2025년 5월 4주차 요양보호 주간보고서",
    clientName: "김복자",
    birthDate: "1934-01-22",
    careLevel: "3등급(추정)",
    guardianContact: "010-2345-2345",
    reportDate: "2025-06-06",
    socialWorkerName: "김난영",
    summary: "대상자께서는 최근 전반적인 신체 기능 저하로 가사활동에 큰 어려움을 겪고 계시며, 지속적인 요통 및 야간 통증으로 인해 삶의 질 저하를 호소하고 계십니다. 일상생활 전반에 불편이 있으셔서 방문 요양 및 돌봄 지원이 절실한 상태입니다.",
    riskNotes: "최근 대상자님께서는 야간 심한 통증과 신체적 불편함으로 인해 낙상 위험이 높으며, 가사활동 자체가 어려운 상황입니다. 또한, 통증 증상 악화로 의료적 지원과 함께 일상생활 전반의 관리가 필요합니다.",
    evaluation: "대상자님의 현재 건강 상태를 고려할 때 의료적 관리와 적극적인 가사 지원이 동반되어야 할 것으로 사료됩니다. 통증 호소가 심해 일상생활 활동 제한이 발생하므로, 정기적인 건강 체크 및 적시에 의료기관 진료를 받을 수 있도록 가족 및 보호자 협력이 필요합니다.",
    suggestion: "정기적인 방문 요양 돌봄, 가사 지원 서비스 지속 제공, 통증 완화를 위한 전문 진료 동행, 필요시 보조기구 지원 등을 권고드립니다. 보호자께서는 대상자님의 야간 돌발상황 대처를 위해 연락체계를 구축해 주시기 바랍니다.",
    journalSummary: []
  },
  {
    file: "weekly-report-3f61db93-c2a0-4278-905d-ac67b554d49e.docx",
    docx_url: "https://oncare-backend.s3.amazonaws.com/weekly-report/docx/weekly-report-3f61db93-c2a0-4278-905d-ac67b554d49e.docx",
    pdf_url: "https://oncare-backend.s3.amazonaws.com/weekly-report/pdf/weekly-report-3f61db93-c2a0-4278-905d-ac67b554d49e.pdf",
    title: "2025년 5월 5주차 요양보호 주간보고서",
    clientName: "홍길동",
    birthDate: "1930-05-29",
    careLevel: "2등급",
    guardianContact: "010-2345-2345",
    reportDate: "2025-06-06",
    socialWorkerName: "김난영",
    summary: "대상자님은 최근 신체적인 통증과 함께 가사활동의 어려움을 호소하고 계십니다. 또한, 심각한 탈모와 그로 인한 심리적 불편감도 관찰됩니다. 정상적인 일상생활을 유지하기 힘들어하며, 병의원 동행 등 추가적인 지원이 필요한 상태로 보입니다.",
    riskNotes: "대상자님은 주기적인 통증으로 인해 밤에 수면에 어려움을 겪고 계시며, 탈모 후유증 역시 심각하여 자존감 저하 및 우울감 위험이 존재합니다. 최근의 신체적 불편함으로 인한 낙상, 외부 활동 위축, 건강 상태 악화의 가능성에도 각별한 주의가 필요합니다.",
    evaluation: "현재 대상자님께서는 일상적인 가사노동을 독립적으로 수행하시기에 무리가 있고, 신체 및 정서적 건강의 빠른 회복을 위해 전문 의료 서비스 연계가 시급해 보입니다. 병원 치료 외에도 지속적인 상담 및 정서적 지지가 도움이 될 것으로 판단됩니다.",
    suggestion: "필요 시 보호자님 및 지역사회 내 관련 기관과 협력하여 병의원 동행 서비스를 적극 제공할 것을 권장드립니다. 또한, 추가적인 통증 관리 및 심리 상담 프로그램 참여를 추천드리며, 일상생활 내 낙상 방지를 위한 환경 점검과 정기적 건강 모니터링이 필요합니다.",
    journalSummary: []
  }
];