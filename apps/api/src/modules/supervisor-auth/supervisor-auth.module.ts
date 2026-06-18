import { Module } from '@nestjs/common';
import { SupervisorAuthController } from './supervisor-auth.controller';
import { SupervisorAuthService } from './supervisor-auth.service';

@Module({
  controllers: [SupervisorAuthController],
  providers: [SupervisorAuthService],
  exports: [SupervisorAuthService],
})
export class SupervisorAuthModule {}
