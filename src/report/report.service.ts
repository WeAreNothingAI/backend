import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class JournalService {
  async create(dto: CreateReportDto) {
    // 1. FastAPI 호출
    const { data } = await axios.post('http://whisper:5000/generate-journal-docx', {
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
      note: dto.note
    });

    if (!data) {
      throw new Error('python-report 서버에서 유효한 응답을 받지 못했습니다.');
    }

    // FastAPI 결과만 반환
    return data;
  }
}