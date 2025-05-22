import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { HttpModule } from '@nestjs/axios';
import { JournalGateway } from './journal.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get('STT_TIMEOUT', 5000),
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [JournalController],
  providers: [JournalService, JournalGateway, PrismaService],
})
export class JournalModule {}
