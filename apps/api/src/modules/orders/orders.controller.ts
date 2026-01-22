import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService, OrderStatus } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los pedidos' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: OrderStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.ordersService.findAll(tenantId, { status, fromDate, toDate });
  }

  @Get('pending')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar pedidos pendientes (para caja)' })
  async findPending(@CurrentUser('tenantId') tenantId: string) {
    return this.ordersService.findPending(tenantId);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Listar mis pedidos (vendedor)' })
  async findMyOrders(@CurrentUser() user: CurrentUserData) {
    return this.ordersService.findAll(user.tenantId, { userId: user.id });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pedido por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.ordersService.findOne(id, tenantId);
  }

  @Post()
  @Roles(Role.SELLER, Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Crear un nuevo pedido' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.tenantId, user.id, createOrderDto);
  }

  @Patch(':id/status')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      id,
      user.tenantId,
      user.id,
      updateStatusDto,
    );
  }

  @Post(':id/pay')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Procesar pago del pedido' })
  async processPayment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() paymentDto: ProcessPaymentDto,
  ) {
    return this.ordersService.processPayment(
      id,
      user.tenantId,
      user.id,
      paymentDto,
    );
  }

  @Post(':id/cancel')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Cancelar pedido' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() cancelDto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(
      id,
      user.tenantId,
      user.id,
      cancelDto.reason,
    );
  }
}
