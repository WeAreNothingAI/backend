import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JournalModule } from './journal/journal.module';
import { ReportModule } from './report/report.module';
import { ConfigModule } from '@nestjs/config';
import { S3Module } from './s3/s3.module';

@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JournalModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
