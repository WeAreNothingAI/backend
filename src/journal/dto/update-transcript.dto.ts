import { ApiProperty } from '@nestjs/swagger';

export class TranscriptUpdateDto {
  @ApiProperty()
  editedTranscript: string;
}
