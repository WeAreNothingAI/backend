import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { HttpModule } from '@nestjs/axios';
import { JournalGateway } from './journal.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get('STT_TIMEOUT', 5000),
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    S3Module,
  ],
  controllers: [JournalController],
  providers: [JournalService, JournalGateway, PrismaService],
  exports: [JournalService],
})
export class JournalModule {}
