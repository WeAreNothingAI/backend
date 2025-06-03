import { ApiProperty } from '@nestjs/swagger';
import { JournalUpdatedDto } from './journal-updated.dto';

export class GenerateJournalDocxResponseDto {
  @ApiProperty({ example: 'journal-7ea9b9f5-4f25-46d3-8956-0ed7f7e86467.docx' })
  file: string;

  @ApiProperty({ example: 'https://oncare-backend.s3.amazonaws.com/journal/docx/journal-7ea9b9f5-4f25-46d3-8956-0ed7f7e86467.docx' })
  docx_url: string;

  @ApiProperty({ example: 'https://oncare-backend.s3.amazonaws.com/journal/pdf/journal-7ea9b9f5-4f25-46d3-8956-0ed7f7e86467.pdf' })
  pdf_url: string;

  @ApiProperty({ example: '대상자님은 2025년 5월 26일에 상담사와 상담을 진행하고 계십니다.' })
  summary: string;           // 상담내용(요약)

  @ApiProperty({ example: '상담 초기 인사 및 내담자 확인 완료, 상담을 시작하기 전에 일자와 대상자를 다시 안내함.' })
  recommendations: string;   // 조치사항

  @ApiProperty({ example: '상담을 시작하며 대상자와 라포를 형성하고 신뢰를 쌓기 위한 사전 절차를 성실히 이행함. 할머니의 기분과 건강 상태를 먼저 점검할 필요가 있음.' })
  opinion: string;           // 상담자의견

  @ApiProperty({ example: '상담 서두에서 일자, 대상자, 상담사를 모두 확인하고 본격적인 상담이 시작될 수 있도록 준비됨.' })
  result: string;            // 상담결과

  @ApiProperty({ example: '상담 전 기본 정보를 재확인하며 내담자와의 친밀감을 형성하는 절차를 진행함.' })
  note: string;              // 비고

  @ApiProperty({ type: JournalUpdatedDto })
  updated: JournalUpdatedDto;
}

export class GenerateJournalPdfResponseDto {
  @ApiProperty({ example: 'https://example.com/journal-7ba09f75-4f25-4fc3-8955-be47f9b64087.pdf', description: 'pdf 파일 S3 URL' })
  pdf_url: string;
} 