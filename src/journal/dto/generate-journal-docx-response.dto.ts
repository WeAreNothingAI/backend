export class GenerateJournalDocxResponseDto {
  file: string;
  docx_url: string;
  pdf_url: string;
  summary: string;           // 상담내용(요약)
  recommendations: string;   // 조치사항
  opinion: string;           // 상담자의견
  result: string;            // 상담결과
  note: string;              // 비고
}

export class GenerateJournalPdfResponseDto {
  pdf_url: string;
} 