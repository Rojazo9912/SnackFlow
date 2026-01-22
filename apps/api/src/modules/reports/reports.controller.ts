import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener resumen para dashboard' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getDashboardSummary(tenantId);
  }

  @Get('daily-sales')
  @ApiOperation({ summary: 'Obtener ventas del dia' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  async getDailySales(
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getDailySales(tenantId, date);
  }

  @Get('sales-by-hour')
  @ApiOperation({ summary: 'Obtener ventas por hora' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  async getSalesByHour(
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getSalesByHour(tenantId, date);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Obtener productos mas vendidos' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopProducts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getTopProducts(tenantId, days, limit);
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Comparar ventas de hoy vs ayer' })
  async getComparison(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getSalesComparison(tenantId);
  }
}
