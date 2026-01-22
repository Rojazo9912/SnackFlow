import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

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

    data?.forEach((item) => {
      const product = item.product as { id: string; name: string; code: string };
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
}
