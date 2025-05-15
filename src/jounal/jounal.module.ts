import { Module } from '@nestjs/common';
import { JounalController } from './jounal.controller';
import { JounalService } from './jounal.service';
import { HttpModule } from '@nestjs/axios';
import { JounalGateway } from './jounal.gateway';

@Module({
  imports: [HttpModule],
  controllers: [JounalController],
  providers: [JounalService, JounalGateway],
})
export class JounalModule {}
