import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WorkController],
  providers: [WorkService, PrismaService],
})
export class WorkModule {}
