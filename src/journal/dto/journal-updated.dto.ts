import { ApiProperty } from '@nestjs/swagger';

export class JournalUpdatedDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 1 })
  careWorkerId: number;

  @ApiProperty({ example: 1 })
  clientId: number;

  @ApiProperty({ example: 'https://oncare-backend.s3.amazonaws.com/audio/audio_1_1748234633581.webm' })
  rawAudioUrl: string;

  @ApiProperty({ example: '안녕하세요 오늘은 이천 이십 오 년 오 월 이십 육 일입니다 저는 상담사 김단영이고 오늘은 김 복자 할머니와의 상담이 있겠습니다 감사합니다' })
  transcript: string;

  @ApiProperty({ example: '대상자님은 2025년 5월 26일에 상담사와 상담을 진행하고 계십니다.' })
  summary: string;

  @ApiProperty({ example: '상담 초기 인사 및 내담자 확인 완료, 상담을 시작하기 전에 일자와 대상자를 다시 안내함.' })
  recommendations: string;

  @ApiProperty({ example: '상담을 시작하며 대상자와 라포를 형성하고 신뢰를 쌓기 위한 사전 절차를 성실히 이행함. 할머니의 기분과 건강 상태를 먼저 점검할 필요가 있음.' })
  opinion: string;

  @ApiProperty({ example: '상담 서두에서 일자, 대상자, 상담사를 모두 확인하고 본격적인 상담이 시작될 수 있도록 준비됨.' })
  result: string;

  @ApiProperty({ example: '상담 전 기본 정보를 재확인하며 내담자와의 친밀감을 형성하는 절차를 진행함.' })
  note: string;

  @ApiProperty({ example: 'https://oncare-backend.s3.amazonaws.com/journal/pdf/journal-7ea9b9f5-4f25-46d3-8956-0ed7f7e86467.pdf' })
  exportedPdf: string;

  @ApiProperty({ example: 'https://oncare-backend.s3.amazonaws.com/journal/docx/journal-7ea9b9f5-4f25-46d3-8956-0ed7f7e86467.docx' })
  exportedDocx: string;

  @ApiProperty({ example: '2025-05-26T04:43:53.853Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-06-03T05:26:41.771Z' })
  updatedAt: string;
} 