import { ApiProperty } from '@nestjs/swagger';

export class JournalSummaryResponseDto {
  @ApiProperty({
    example: '대상자님은 2025년 5월 26일에 상담사와 상담을 진행하고 계십니다.',
    description: '상담 요약',
  })
  summary: string;

  @ApiProperty({
    example: '상담 초기 인사 및 내담자 확인 완료, 상담을 시작하기 전에 일자와 대상자를 다시 안내함.',
    description: '상담 권고사항',
  })
  recommendations: string;

  @ApiProperty({
    example: '상담을 시작하며 대상자와 라포를 형성하고 신뢰를 쌓기 위한 사전 절차를 성실히 이행함. 할머니의 기분과 건강 상태를 먼저 점검할 필요가 있음.',
    description: '상담 의견',
  })
  opinion: string;

  @ApiProperty({
    example: '상담 서두에서 일자, 대상자, 상담사를 모두 확인하고 본격적인 상담이 시작될 수 있도록 준비됨.',
    description: '상담 결과',
  })
  result: string;

  @ApiProperty({
    example: '상담 전 기본 정보를 재확인하며 내담자와의 친밀감을 형성하는 절차를 진행함.',
    description: '상담 노트',
  })
  note: string;
} 