import { Module } from '@nestjs/common';
import { JounalController } from './jounal.controller';
import { JournalService } from './jounal.service';
import { HttpModule } from '@nestjs/axios';
import { JounalGateway } from './jounal.gateway';

@Module({
  imports: [HttpModule],
  controllers: [JounalController],
  providers: [JournalService, JounalGateway],
})
export class JounalModule {}
