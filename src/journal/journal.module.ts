import { forwardRef, Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalGateway } from './journal.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { S3Service } from '../s3/s3.service';
import { ClientService } from 'src/client/client.service';

@Module({
  imports: [HttpModule, forwardRef(() => JournalModule)],
  controllers: [JournalController],
  providers: [
    JournalService,
    JournalGateway,
    PrismaService,
    S3Service,
    ClientService,
  ],
  exports: [JournalService],
})
export class JournalModule {}
