import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JournalModule } from './journal/journal.module';
import { ReportModule } from './report/report.module';
import { ConfigModule } from '@nestjs/config';

@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JournalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
