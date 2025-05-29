import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async createClient(data: CreateClientDto) {
    const { birthDate, gender, ...otherData } = data;

    if (gender !== '여' && gender !== '남') {
      throw new BadRequestException('성별은 `여` 또는 `남`만 가능합니다.');
    }

    const parsedDate = new Date(birthDate);

    return await this.prisma.client.create({
      data: { gender, ...otherData, birthDate: parsedDate },
    });
  }
}
