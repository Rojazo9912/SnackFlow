import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService, MovementType } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: MovementType })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMovements(
    @CurrentUser('tenantId') tenantId: string,
    @Query('productId') productId?: string,
    @Query('type') type?: MovementType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getMovements(tenantId, {
      productId,
      type,
      fromDate,
      toDate,
      limit,
    });
  }

  @Get('kardex/:productId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener kardex de un producto' })
  async getKardex(
    @Param('productId') productId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.inventoryService.getKardex(tenantId, productId);
  }

  @Get('low-stock')
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CASHIER)
  @ApiOperation({ summary: 'Listar productos con stock bajo' })
  async getLowStock(@CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getLowStockProducts(tenantId);
  }

  @Post('adjust')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Ajustar stock de un producto' })
  async adjustStock(
    @CurrentUser() user: CurrentUserData,
    @Body() adjustDto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(user.tenantId, user.id, adjustDto);
  }
}
