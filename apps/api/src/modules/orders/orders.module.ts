import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [CashRegisterModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }
