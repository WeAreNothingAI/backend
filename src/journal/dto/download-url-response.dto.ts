import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlResponseDto {
  @ApiProperty({
    example: 'https://oncare-backend.s3.amazonaws.com/journal/docx/journal-2c9a8070-24f6-41ed-a68c-9e27b82a4777.docx?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
    description: 'S3 presigned 다운로드 URL',
  })
  download_url: string;
} 