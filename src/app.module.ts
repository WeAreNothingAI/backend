import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JounalModule } from './session/jounal.module';

@Module({
  imports: [JounalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
