import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
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
  constructor(private readonly reportsService: ReportsService) { }

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

  @Get('sales-trend')
  @ApiOperation({ summary: 'Obtener tendencia de ventas' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Número de días (default: 7)' })
  async getSalesTrend(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days') days?: number,
  ) {
    return this.reportsService.getSalesTrend(tenantId, days);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener KPIs del dashboard' })
  async getKPIs(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getKPIs(tenantId);
  }

  @Get('daily-sales/export')
  @ApiOperation({ summary: 'Exportar ventas del dia' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['excel', 'pdf'] })
  async exportDailySales(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('date') date?: string,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
  ) {
    const rawBuffer =
      format === 'pdf'
        ? await this.reportsService.generateDailySalesReportPDF(tenantId, date)
        : await this.reportsService.generateDailySalesReportExcel(tenantId, date);

    const buffer = Buffer.from(rawBuffer as ArrayBuffer);
    const filename = `ventas_${date || new Date().toISOString().split('T')[0]}`;
    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}.${extension}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('top-products/export')
  @ApiOperation({ summary: 'Exportar productos mas vendidos' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['excel', 'pdf'] })
  async exportTopProducts(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('days') days?: number,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
  ) {
    // Only Excel for now for Top Products to keep it simple
    const rawBuffer = await this.reportsService.generateTopProductsReportExcel(
      tenantId,
      days,
    );

    const buffer = Buffer.from(rawBuffer as ArrayBuffer);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="top_productos_${days || 7}dias.xlsx"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
