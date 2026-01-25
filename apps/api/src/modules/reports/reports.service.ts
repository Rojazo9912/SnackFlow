import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import * as ExcelJS from 'exceljs';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');

@Injectable()
export class ReportsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) { }

  async getDailySales(tenantId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00`;
    const endOfDay = `${targetDate}T23:59:59`;

    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('id, total, payment_method, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error) {
      throw new Error(`Error obteniendo ventas: ${error.message}`);
    }

    const totalSales = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const ticketCount = orders?.length || 0;
    const averageTicket = ticketCount > 0 ? totalSales / ticketCount : 0;

    // Group by payment method
    const byPaymentMethod = orders?.reduce(
      (acc, o) => {
        const method = o.payment_method || 'other';
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }
        acc[method].count++;
        acc[method].total += o.total || 0;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    return {
      date: targetDate,
      totalSales,
      ticketCount,
      averageTicket: Math.round(averageTicket * 100) / 100,
      byPaymentMethod,
    };
  }

  async getCashSessionSummary(sessionId: string, tenantId: string) {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('id, total, payment_method, payment_details')
      .eq('tenant_id', tenantId)
      .eq('cash_register_session_id', sessionId)
      .eq('status', 'paid');

    if (error) {
      throw new Error(`Error obteniendo resumen de caja: ${error.message}`);
    }

    const totalSales = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const transactionCount = orders?.length || 0;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    const byPaymentMethod: Record<string, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      mixed: 0
    };

    orders?.forEach((o) => {
      // Handle mixed payments if payment_details exists
      if (o.payment_method === 'mixed' && o.payment_details && typeof o.payment_details === 'object') {
        const details = o.payment_details as any;
        if (details.payments && Array.isArray(details.payments)) {
          details.payments.forEach((p: any) => {
            if (byPaymentMethod[p.method] !== undefined) {
              byPaymentMethod[p.method] += p.amount || 0;
            }
          });
          byPaymentMethod.mixed += o.total; // Clean tracking of mixed total volume if needed, or just keep individual parts
          // Actually, for the widget we usually want strict liquidity (cash/card/transfer).
          // But passing 'mixed' might be useful context.
        }
      } else {
        const method = o.payment_method;
        if (byPaymentMethod[method] !== undefined) {
          byPaymentMethod[method] += o.total || 0;
        }
      }
    });

    return {
      totalSales,
      transactionCount,
      averageTicket,
      byPaymentMethod,
    };
  }

  async getSalesByHour(tenantId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00`;
    const endOfDay = `${targetDate}T23:59:59`;

    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('total, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error) {
      throw new Error(`Error obteniendo ventas: ${error.message}`);
    }

    // Group by hour
    const byHour: Record<number, { count: number; total: number }> = {};
    for (let i = 0; i < 24; i++) {
      byHour[i] = { count: 0, total: 0 };
    }

    orders?.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      byHour[hour].count++;
      byHour[hour].total += o.total || 0;
    });

    return {
      date: targetDate,
      byHour,
    };
  }

  async getTopProducts(tenantId: string, days = 7, limit = 10) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('order_items')
      .select(
        `
        quantity,
        subtotal,
        product:products!inner(id, name, code, tenant_id)
      `,
      )
      .eq('product.tenant_id', tenantId);

    if (error) {
      throw new Error(`Error obteniendo productos: ${error.message}`);
    }

    // Aggregate by product
    const productStats: Record<
      string,
      { id: string; name: string; code: string; quantity: number; revenue: number }
    > = {};

    data?.forEach((item: any) => {
      const product = (Array.isArray(item.product) ? item.product[0] : item.product) as {
        id: string;
        name: string;
        code: string;
      };

      if (!product) return;

      if (!productStats[product.id]) {
        productStats[product.id] = {
          id: product.id,
          name: product.name,
          code: product.code,
          quantity: 0,
          revenue: 0,
        };
      }
      productStats[product.id].quantity += item.quantity;
      productStats[product.id].revenue += item.subtotal;
    });

    // Sort by quantity and limit
    const sorted = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return {
      period: `${days} dias`,
      products: sorted,
    };
  }

  async getSalesComparison(tenantId: string) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [todaySales, yesterdaySales] = await Promise.all([
      this.getDailySales(tenantId, todayStr),
      this.getDailySales(tenantId, yesterdayStr),
    ]);

    const difference = todaySales.totalSales - yesterdaySales.totalSales;
    const percentChange =
      yesterdaySales.totalSales > 0
        ? ((difference / yesterdaySales.totalSales) * 100).toFixed(1)
        : '0';

    return {
      today: todaySales,
      yesterday: yesterdaySales,
      difference,
      percentChange: `${percentChange}%`,
    };
  }

  async getDashboardSummary(tenantId: string) {
    const [dailySales, comparison, topProducts, lowStock] = await Promise.all([
      this.getDailySales(tenantId),
      this.getSalesComparison(tenantId),
      this.getTopProducts(tenantId, 7, 5),
      this.getLowStockCount(tenantId),
    ]);

    return {
      dailySales,
      comparison,
      topProducts: topProducts.products,
      lowStockCount: lowStock,
    };
  }

  private async getLowStockCount(tenantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, stock, min_stock')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .not('min_stock', 'is', null);

    if (error) return 0;

    return data?.filter((p) => p.stock <= p.min_stock).length || 0;
  }

  async generateDailySalesReportExcel(tenantId: string, date?: string) {
    const data = await this.getDailySales(tenantId, date);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ventas Diarias');

    // Styling
    worksheet.columns = [
      { header: 'Concepto', key: 'label', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ];

    worksheet.addRow({ label: 'Fecha de Reporte', value: data.date });
    worksheet.addRow({ label: 'Total de Ventas', value: data.totalSales });
    worksheet.addRow({ label: 'Cantidad de Tickets', value: data.ticketCount });
    worksheet.addRow({ label: 'Ticket Promedio', value: data.averageTicket });
    worksheet.addRow({});
    worksheet.addRow({ label: 'Ventas por Método de Pago' }).font = { bold: true };

    Object.entries(data.byPaymentMethod || {}).forEach(([method, stats]: [string, any]) => {
      worksheet.addRow({
        label: method.toUpperCase(),
        value: `${stats.total} (${stats.count} tickets)`,
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  async generateDailySalesReportPDF(tenantId: string, date?: string): Promise<Buffer> {
    const data = await this.getDailySales(tenantId, date);

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'SnackFlow - Reporte de Ventas Diarias', style: 'header' },
        { text: `Fecha: ${data.date}`, margin: [0, 10, 0, 20] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Concepto', 'Valor'],
              ['Total de Ventas', `$${data.totalSales.toFixed(2)}`],
              ['Cantidad de Tickets', data.ticketCount.toString()],
              ['Ticket Promedio', `$${data.averageTicket.toFixed(2)}`],
            ],
          },
        },
        { text: '\nResumen por Método de Pago', style: 'subheader' },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              ['Método', 'Ventas', 'Tickets'],
              ...Object.entries(data.byPaymentMethod || {}).map(([method, stats]: [string, any]) => [
                method.toUpperCase(),
                `$${stats.total.toFixed(2)}`,
                stats.count.toString(),
              ]),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
    };

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async generateTopProductsReportExcel(tenantId: string, days = 7) {
    const data = await this.getTopProducts(tenantId, days);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos más vendidos');

    worksheet.columns = [
      { header: 'Producto', key: 'name', width: 30 },
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Cantidad', key: 'quantity', width: 15 },
      { header: 'Ingresos', key: 'revenue', width: 15 },
    ];

    data.products.forEach((p) => {
      worksheet.addRow(p);
    });

    return workbook.xlsx.writeBuffer();
  }

  // New methods for dashboard charts
  async getSalesTrend(tenantId: string, days = 7) {
    const trend = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const sales = await this.getDailySales(tenantId, dateStr);
      trend.push({
        date: dateStr,
        total: sales.totalSales,
        orders: sales.ticketCount,
      });
    }

    return trend;
  }

  async getKPIs(tenantId: string) {
    const [todaySales, comparison, lowStock, pendingOrders] = await Promise.all([
      this.getDailySales(tenantId),
      this.getSalesComparison(tenantId),
      this.getLowStockCount(tenantId),
      this.getPendingOrdersCount(tenantId),
    ]);

    return {
      todaySales: todaySales.totalSales,
      averageTicket: todaySales.averageTicket,
      lowStockProducts: lowStock,
      pendingOrders,
      yesterdaySales: comparison.yesterday.totalSales,
      percentChange: comparison.percentChange,
    };
  }

  private async getPendingOrdersCount(tenantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (error) return 0;
    return data?.length || 0;
  }
}
