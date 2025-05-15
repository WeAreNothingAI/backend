import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  async create(dto: CreateReportDto) {
    // 1. FastAPI 호출
    const { data } = await axios.post('http://localhost:8000/generate-docx', {
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

    // FastAPI 결과만 반환
    return data;
  }
}