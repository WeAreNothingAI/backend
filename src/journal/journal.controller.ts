import { Controller, Post, Param, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JournalService } from './journal.service';

@ApiTags('journal')
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  // 일지 요약 생성 API
  @Post(':id/summary')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '상담 일지 요약 및 문서 생성',
    description: 'DB에 저장된 transcript를 기반으로 python-report를 호출해 상담일지(docx)를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '상담일지 docx 파일 생성 성공',
  })
  @ApiResponse({
    status: 404,
    description: '일지를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: 500,
    description: '서버 오류',
  })
  async summarizeJournal(@Param('id') id: number) {
    const result = await this.journalService.summarizeJournal(id);
    if (!result) {
      throw new HttpException('일지를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return result;
  }
}
