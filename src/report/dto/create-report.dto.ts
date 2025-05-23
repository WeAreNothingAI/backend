export class CreateReportDto {
  text: string;           // STT 원문
  date: string;           // 상담일자
  service: string;
  manager: string;
  method: string;
  type: string;
  time: string;
  title: string;
  category: string;
  client: string;
  contact: string;
  opinion: string;
  result: string;
  note: string;

  // 저장용 필드
  // caseManagerId: number;
  // clientId: number;
  // careWorkerId: number;
  // periodStart: Date;
  // periodEnd: Date;
}
