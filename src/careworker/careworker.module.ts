import { Module } from '@nestjs/common';
import { CareworkerController } from './careworker.controller';
import { CareworkerService } from './careworker.service';

@Module({
  controllers: [CareworkerController],
  providers: [CareworkerService],
  exports: [CareworkerService],
})
export class CareworkerModule {}
