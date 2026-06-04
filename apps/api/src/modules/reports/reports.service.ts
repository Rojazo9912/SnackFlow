import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import * as ExcelJS from 'exceljs';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');

const BUSINESS_TIMEZONE = 'America/Mexico_City';

/** Get current date in business timezone as YYYY-MM-DD */
function getLocalDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(date);
}

/** Get list of date strings YYYY-MM-DD in range */
function getDaysArray(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startStr}T12:00:00`);
  const end = new Date(`${endStr}T12:00:00`);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/** Get UTC start/end bounds for a local business day */
function getLocalDayBoundsUTC(dateStr?: string): { startOfDay: string; endOfDay: string } {
  if (!dateStr) {
    dateStr = getLocalDate();
  }

  // Use noon UTC as reference to calculate timezone offset (avoids DST edge cases)
  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const utcHour = refDate.getUTCHours(); // 12
  const localHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(refDate),
  );
  const offsetHours = localHour - utcHour;
  const offsetMs = offsetHours * 60 * 60 * 1000;

  // Local midnight converted to UTC
  const startUTC = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - offsetMs);
  const endUTC = new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() - offsetMs);

  return {
    startOfDay: startUTC.toISOString(),
    endOfDay: endUTC.toISOString(),
  };
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) { }

  async getDailySales(tenantId: string, date?: string, fromDate?: string, toDate?: string) {
    const targetDate = date || fromDate || getLocalDate();
    let start: string;
    let end: string;
    let rangeLabel: string;
    let currentDurationDays = 1;

    let currentFromStr: string;
    let currentToStr: string;

    if (fromDate && toDate) {
      currentFromStr = fromDate;
      currentToStr = toDate;
      const from = new Date(`${fromDate}T12:00:00`);
      const to = new Date(`${toDate}T12:00:00`);
      const diffTime = Math.abs(to.getTime() - from.getTime());
      currentDurationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      start = getLocalDayBoundsUTC(fromDate).startOfDay;
      end = getLocalDayBoundsUTC(toDate).endOfDay;
      rangeLabel = fromDate === toDate ? fromDate : `${fromDate} al ${toDate}`;
    } else {
      currentFromStr = targetDate;
      currentToStr = targetDate;
      currentDurationDays = 1;
      const bounds = getLocalDayBoundsUTC(targetDate);
      start = bounds.startOfDay;
      end = bounds.endOfDay;
      rangeLabel = targetDate;
    }

    // Calculate previous period dates
    const fromDateObj = new Date(`${currentFromStr}T12:00:00`);
    const toDateObj = new Date(`${currentToStr}T12:00:00`);

    const prevFromDate = new Date(fromDateObj);
    prevFromDate.setDate(fromDateObj.getDate() - currentDurationDays);
    const prevToDate = new Date(toDateObj);
    prevToDate.setDate(toDateObj.getDate() - currentDurationDays);

    const prevFromStr = prevFromDate.toISOString().split('T')[0];
    const prevToStr = prevToDate.toISOString().split('T')[0];

    const prevStart = getLocalDayBoundsUTC(prevFromStr).startOfDay;
    const prevEnd = getLocalDayBoundsUTC(prevToStr).endOfDay;

    const [currentResult, prevResult] = await Promise.all([
      this.supabase
        .from('orders')
        .select('id, total, payment_method, payment_details, paid_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('paid_at', start)
        .lt('paid_at', end),
      this.supabase
        .from('orders')
        .select('id, total, paid_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('paid_at', prevStart)
        .lt('paid_at', prevEnd)
    ]);

    if (currentResult.error) {
      throw new Error(`Error obteniendo ventas del período actual: ${currentResult.error.message}`);
    }
    if (prevResult.error) {
      throw new Error(`Error obteniendo ventas del período anterior: ${prevResult.error.message}`);
    }

    const orders = currentResult.data;
    const prevOrders = prevResult.data;

    const totalSales = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const ticketCount = orders?.length || 0;
    const averageTicket = ticketCount > 0 ? totalSales / ticketCount : 0;

    const prevTotalSales = prevOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const prevTicketCount = prevOrders?.length || 0;
    const prevAverageTicket = prevTicketCount > 0 ? prevTotalSales / prevTicketCount : 0;

    // Helper to calculate percentage change
    const calcPercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '100' : '0';
      const change = ((current - previous) / previous) * 100;
      return change.toFixed(1);
    };

    const comparison = {
      prevTotalSales,
      prevTicketCount,
      prevAverageTicket: Math.round(prevAverageTicket * 100) / 100,
      salesChange: calcPercentageChange(totalSales, prevTotalSales),
      ticketsChange: calcPercentageChange(ticketCount, prevTicketCount),
      averageTicketChange: calcPercentageChange(averageTicket, prevAverageTicket),
      prevPeriodLabel: prevFromStr === prevToStr ? prevFromStr : `${prevFromStr} al ${prevToStr}`,
    };

    // Group by payment method
    const byPaymentMethod = orders?.reduce(
      (acc, o) => {
        if (o.payment_method === 'mixed' && o.payment_details) {
          let details: any = o.payment_details as any;
          if (typeof details === 'string') {
            try {
              details = JSON.parse(details);
            } catch {
              details = null;
            }
          }

          if (details && details.payments && Array.isArray(details.payments)) {
            details.payments.forEach((p: any) => {
              const method = p.method || 'other';
              if (!acc[method]) {
                acc[method] = { count: 0, total: 0 };
              }
              acc[method].count++;
              acc[method].total += p.amount || 0;
            });

            if (!acc['mixed']) {
              acc['mixed'] = { count: 0, total: 0 };
            }
            acc['mixed'].count++;
            acc['mixed'].total += o.total || 0;
          } else {
            const method = 'mixed';
            if (!acc[method]) {
              acc[method] = { count: 0, total: 0 };
            }
            acc[method].count++;
            acc[method].total += o.total || 0;
          }
        } else {
          const method = o.payment_method || 'other';
          if (!acc[method]) {
            acc[method] = { count: 0, total: 0 };
          }
          acc[method].count++;
          acc[method].total += o.total || 0;
        }
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    return {
      date: targetDate,
      rangeLabel,
      totalSales,
      ticketCount,
      averageTicket: Math.round(averageTicket * 100) / 100,
      byPaymentMethod,
      comparison,
      orders: orders || [],
    };
  }

  async getCashSessionSummary(sessionId: string, tenantId: string) {
    // Run queries in parallel
    const [ordersResult, sessionResult, movementsResult] = await Promise.all([
      this.supabase
        .from('orders')
        .select(`
          id,
          total,
          payment_method,
          payment_details,
          created_at,
          user:users!orders_user_id_fkey(name),
          order_items(
            id,
            quantity,
            unit_price,
            subtotal,
            notes,
            product:products(id, name, code)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('cash_register_session_id', sessionId)
        .eq('status', 'paid'),
      this.supabase
        .from('cash_sessions')
        .select('opening_amount')
        .eq('id', sessionId)
        .single(),
      this.supabase
        .from('cash_movements')
        .select('type, amount')
        .eq('session_id', sessionId)
    ]);

    if (ordersResult.error) {
      throw new Error(`Error obteniendo ventas: ${ordersResult.error.message}`);
    }

    const orders = ordersResult.data;
    const openingAmount = sessionResult.data?.opening_amount || 0;
    const movements = movementsResult.data || [];

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
      if (o.payment_method === 'mixed' && o.payment_details) {
        let details: any = o.payment_details as any;
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch {
            details = null;
          }
        }

        if (details && details.payments && Array.isArray(details.payments)) {
          details.payments.forEach((p: any) => {
            if (byPaymentMethod[p.method] !== undefined) {
              byPaymentMethod[p.method] += p.amount || 0;
            }
          });
          byPaymentMethod.mixed += o.total;
        }
      } else {
        const method = o.payment_method;
        if (byPaymentMethod[method] !== undefined) {
          byPaymentMethod[method] += o.total || 0;
        }
      }
    });

    // Calculate movements
    let deposits = 0;
    let withdrawals = 0;
    movements.forEach(m => {
      if (m.type === 'deposit') deposits += m.amount;
      if (m.type === 'withdrawal') withdrawals += m.amount;
    });

    // Calculate Expected Cash
    // Expected = Opening + Cash Sales + Deposits - Withdrawals
    const cashSales = byPaymentMethod.cash; // distinct from total sales
    const expectedCash = openingAmount + cashSales + deposits - withdrawals;

    return {
      totalSales,
      transactionCount,
      averageTicket,
      byPaymentMethod,
      cashFlow: {
        openingAmount,
        cashSales,
        deposits,
        withdrawals,
        expectedCash
      },
      orders: orders || []
    };
  }

  async getSalesByHour(tenantId: string, date?: string, fromDate?: string, toDate?: string) {
    let start: string;
    let end: string;

    if (fromDate && toDate) {
      start = getLocalDayBoundsUTC(fromDate).startOfDay;
      end = getLocalDayBoundsUTC(toDate).endOfDay;
    } else {
      const targetDate = date || getLocalDate();
      const bounds = getLocalDayBoundsUTC(targetDate);
      start = bounds.startOfDay;
      end = bounds.endOfDay;
    }

    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('total, paid_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', start)
      .lt('paid_at', end);

    if (error) {
      throw new Error(`Error obteniendo ventas: ${error.message}`);
    }

    // Group by hour (in local timezone)
    const byHour: Record<number, { count: number; total: number }> = {};
    for (let i = 0; i < 24; i++) {
      byHour[i] = { count: 0, total: 0 };
    }

    orders?.forEach((o) => {
      const hour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: BUSINESS_TIMEZONE,
          hour: 'numeric',
          hour12: false,
        }).format(new Date(o.paid_at)),
      );
      byHour[hour].count++;
      byHour[hour].total += o.total || 0;
    });

    const targetDate = date || fromDate || getLocalDate();
    return {
      date: targetDate,
      byHour,
    };
  }

  async getTopProducts(tenantId: string, days = 7, limit = 10) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString();

    const { data, error } = await this.supabase
      .from('order_items')
      .select(
        `
        quantity,
        subtotal,
        order:orders!inner(id, tenant_id, status, paid_at),
        product:products!inner(id, name, code, tenant_id)
      `,
      )
      .eq('order.tenant_id', tenantId)
      .eq('order.status', 'paid')
      .gte('order.paid_at', fromDateStr);

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
      period: `${days} días`,
      products: sorted,
    };
  }
  async getSalesComparison(tenantId: string) {
    const todayStr = getLocalDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDate(yesterdayDate);

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

  private calculateDailySalesFromOrders(orders: any[], targetDate: string) {
    const totalSales = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const ticketCount = orders?.length || 0;
    const averageTicket = ticketCount > 0 ? totalSales / ticketCount : 0;

    // Group by payment method
    const byPaymentMethod = orders?.reduce(
      (acc, o) => {
        if (o.payment_method === 'mixed' && o.payment_details) {
          let details: any = o.payment_details as any;
          if (typeof details === 'string') {
            try {
              details = JSON.parse(details);
            } catch {
              details = null;
            }
          }

          if (details && details.payments && Array.isArray(details.payments)) {
            details.payments.forEach((p: any) => {
              const method = p.method || 'other';
              if (!acc[method]) {
                acc[method] = { count: 0, total: 0 };
              }
              acc[method].count++;
              acc[method].total += p.amount || 0;
            });

            if (!acc['mixed']) {
              acc['mixed'] = { count: 0, total: 0 };
            }
            acc['mixed'].count++;
            acc['mixed'].total += o.total || 0;
          } else {
            const method = 'mixed';
            if (!acc[method]) {
              acc[method] = { count: 0, total: 0 };
            }
            acc[method].count++;
            acc[method].total += o.total || 0;
          }
        } else {
          const method = o.payment_method || 'other';
          if (!acc[method]) {
            acc[method] = { count: 0, total: 0 };
          }
          acc[method].count++;
          acc[method].total += o.total || 0;
        }
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    return {
      date: targetDate,
      rangeLabel: targetDate,
      totalSales,
      ticketCount,
      averageTicket: Math.round(averageTicket * 100) / 100,
      byPaymentMethod,
      comparison: null,
    };
  }

  private populateWorksheet(worksheet: ExcelJS.Worksheet, data: any, title: string) {
    worksheet.columns = [
      { header: 'Concepto', key: 'label', width: 30 },
      { header: 'Valor', key: 'value', width: 30 },
    ];

    const titleRow = worksheet.addRow({ label: title, value: '' });
    titleRow.font = { bold: true, size: 12 };
    
    worksheet.addRow({ label: 'Fecha / Período', value: data.rangeLabel });
    worksheet.addRow({ label: 'Total de Ventas', value: data.totalSales });
    if (data.comparison) {
      worksheet.addRow({ label: '  Ventas Período Anterior', value: data.comparison.prevTotalSales });
      worksheet.addRow({ label: '  Diferencia Ventas %', value: `${Number(data.comparison.salesChange) >= 0 ? '+' : ''}${data.comparison.salesChange}%` });
    }
    worksheet.addRow({ label: 'Cantidad de Tickets', value: data.ticketCount });
    if (data.comparison) {
      worksheet.addRow({ label: '  Tickets Período Anterior', value: data.comparison.prevTicketCount });
      worksheet.addRow({ label: '  Diferencia Tickets %', value: `${Number(data.comparison.ticketsChange) >= 0 ? '+' : ''}${data.comparison.ticketsChange}%` });
    }
    worksheet.addRow({ label: 'Ticket Promedio', value: data.averageTicket });
    if (data.comparison) {
      worksheet.addRow({ label: '  Ticket Prom. Per. Anterior', value: data.comparison.prevAverageTicket });
      worksheet.addRow({ label: '  Diferencia Promedio %', value: `${Number(data.comparison.averageTicketChange) >= 0 ? '+' : ''}${data.comparison.averageTicketChange}%` });
    }
    worksheet.addRow({});
    worksheet.addRow({ label: 'Ventas por Método de Pago' }).font = { bold: true };

    Object.entries(data.byPaymentMethod || {}).forEach(([method, stats]: [string, any]) => {
      const methodLabel = method === 'cash' ? 'EFECTIVO' :
                          method === 'card' ? 'TARJETA' :
                          method === 'transfer' ? 'TRANSFERENCIA' :
                          method === 'mixed' ? 'MIXTO' : method.toUpperCase();
      worksheet.addRow({
        label: methodLabel,
        value: `${stats.total} (${stats.count} tickets)`,
      });
    });
  }

  private getPDFReportContent(data: any, title: string): any[] {
    const tableBody = [
      ['Concepto', 'Valor Actual', 'vs Período Anterior'],
      ['Total de Ventas', `$${data.totalSales.toFixed(2)}`, data.comparison ? `$${data.comparison.prevTotalSales.toFixed(2)} (${Number(data.comparison.salesChange) >= 0 ? '+' : ''}${data.comparison.salesChange}%)` : 'N/A'],
      ['Cantidad de Tickets', data.ticketCount.toString(), data.comparison ? `${data.comparison.prevTicketCount} (${Number(data.comparison.ticketsChange) >= 0 ? '+' : ''}${data.comparison.ticketsChange}%)` : 'N/A'],
      ['Ticket Promedio', `$${data.averageTicket.toFixed(2)}`, data.comparison ? `$${data.comparison.prevAverageTicket.toFixed(2)} (${Number(data.comparison.averageTicketChange) >= 0 ? '+' : ''}${data.comparison.averageTicketChange}%)` : 'N/A'],
    ];

    if (!data.comparison) {
      tableBody.forEach(row => row.pop());
      tableBody[0][1] = 'Valor';
    }

    return [
      { text: `SnackFlow - ${title}`, style: 'header' },
      { text: `Período / Fecha: ${data.rangeLabel}`, margin: [0, 5, 0, 15] },
      {
        table: {
          widths: data.comparison ? ['*', '*', '*'] : ['*', '*'],
          body: tableBody,
        },
      },
      { text: '\nResumen por Método de Pago', style: 'subheader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Método', 'Ventas', 'Tickets'],
            ...Object.entries(data.byPaymentMethod || {}).map(([method, stats]: [string, any]) => {
              const methodLabel = method === 'cash' ? 'EFECTIVO' :
                                  method === 'card' ? 'TARJETA' :
                                  method === 'transfer' ? 'TRANSFERENCIA' :
                                  method === 'mixed' ? 'MIXTO' : method.toUpperCase();
              return [
                methodLabel,
                `$${stats.total.toFixed(2)}`,
                stats.count.toString(),
              ];
            }),
          ],
        },
      },
    ];
  }

  async generateDailySalesReportExcel(tenantId: string, date?: string, fromDate?: string, toDate?: string) {
    const workbook = new ExcelJS.Workbook();
    
    const accumData = await this.getDailySales(tenantId, date, fromDate, toDate);
    const accumSheet = workbook.addWorksheet('Acumulado');
    this.populateWorksheet(accumSheet, accumData, 'Resumen Acumulado');

    if (fromDate && toDate && fromDate !== toDate) {
      const days = getDaysArray(fromDate, toDate);
      
      const ordersByDay: Record<string, any[]> = {};
      accumData.orders.forEach((o: any) => {
        const dateStr = getLocalDate(new Date(o.paid_at));
        if (!ordersByDay[dateStr]) {
          ordersByDay[dateStr] = [];
        }
        ordersByDay[dateStr].push(o);
      });

      days.forEach((day) => {
        const dayOrders = ordersByDay[day] || [];
        if (dayOrders.length > 0) {
          const dayData = this.calculateDailySalesFromOrders(dayOrders, day);
          const daySheet = workbook.addWorksheet(day);
          this.populateWorksheet(daySheet, dayData, `Reporte del día ${day}`);
        }
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  async generateDailySalesReportPDF(tenantId: string, date?: string, fromDate?: string, toDate?: string): Promise<Buffer> {
    const accumData = await this.getDailySales(tenantId, date, fromDate, toDate);
    
    const pdfContent: any[] = this.getPDFReportContent(accumData, 'Reporte de Ventas (Acumulado)');

    if (fromDate && toDate && fromDate !== toDate) {
      const days = getDaysArray(fromDate, toDate);
      
      const ordersByDay: Record<string, any[]> = {};
      accumData.orders.forEach((o: any) => {
        const dateStr = getLocalDate(new Date(o.paid_at));
        if (!ordersByDay[dateStr]) {
          ordersByDay[dateStr] = [];
        }
        ordersByDay[dateStr].push(o);
      });

      days.forEach((day) => {
        const dayOrders = ordersByDay[day] || [];
        if (dayOrders.length > 0) {
          const dayData = this.calculateDailySalesFromOrders(dayOrders, day);
          const dayContent = this.getPDFReportContent(dayData, `Reporte de Ventas (Día ${day})`);
          
          if (dayContent.length > 0) {
            dayContent[0].pageBreak = 'before';
          }
          pdfContent.push(...dayContent);
        }
      });
    }

    const docDefinition: TDocumentDefinitions = {
      content: pdfContent,
      styles: {
        header: { fontSize: 16, bold: true },
        subheader: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
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
      const dateStr = getLocalDate(date);

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
    const { count, error } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (error) return 0;
    return count || 0;
  }
}





