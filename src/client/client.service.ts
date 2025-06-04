import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async createClient(data: CreateClientDto, socialWorkerId: number) {
    const { birthDate, gender, careWorkerId, ...otherData } = data;

    if (gender !== '여' && gender !== '남') {
      throw new BadRequestException('성별은 `여` 또는 `남`만 가능합니다.');
    }

    const parsedDate = new Date(birthDate);

    if (!careWorkerId) {
      throw new BadRequestException('careWorkerId는 필수입니다.');
    }

    return await this.prisma.client.create({
      data: {
        gender,
        ...otherData,
        birthDate: parsedDate,
        socialWorkerId,
        careWorkerId,
      },
    });
  }

  async fetchManyClient(socialWorkerId?: number, careWorkerId?: number) {
    const orConditions: any[] = [];

    if (socialWorkerId !== undefined) {
      orConditions.push({ socialWorkerId });
    }

    if (careWorkerId !== undefined) {
      orConditions.push({ careWorkerId });
    }

    return await this.prisma.client.findMany({
      where: {
        OR: orConditions,
      },
    });
  }

  async fetchClient(
    id: number,
    socialWorkerId?: number,
    careWorkerId?: number,
  ) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException('해당 노인은 존재하지 않습니다.');
    }

    if (
      (socialWorkerId && client.socialWorkerId !== socialWorkerId) ||
      (careWorkerId && client.careWorkerId !== careWorkerId)
    ) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    return client;
  }
}
