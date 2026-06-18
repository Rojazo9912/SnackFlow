import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { AdjustStockDto } from './dto/adjust-stock.dto';

export enum MovementType {
  SALE = 'sale',
  ADJUSTMENT_IN = 'adjustment_in',
  ADJUSTMENT_OUT = 'adjustment_out',
  WASTE = 'waste',
  RETURN = 'return',
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async getMovements(
    tenantId: string,
    options?: {
      productId?: string;
      type?: MovementType;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    },
  ) {
    let query = this.supabase
      .from('inventory_movements')
      .select(
        `
        *,
        product:products(id, name, code),
        user:users(id, name)
      `,
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (options?.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }

    if (options?.toDate) {
      query = query.lte('created_at', options.toDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo movimientos: ${error.message}`);
    }

    return data;
  }

  async getKardex(tenantId: string, productId: string) {
    return this.getMovements(tenantId, { productId });
  }

  async adjustStock(tenantId: string, userId: string, adjustDto: AdjustStockDto) {
    // Get current stock
    const { data: product, error: productError } = await this.supabase
      .from('products')
      .select('id, stock, name, cost')
      .eq('id', adjustDto.productId)
      .eq('tenant_id', tenantId)
      .single();

    if (productError || !product) {
      throw new BadRequestException('Producto no encontrado');
    }

    const previousStock = product.stock || 0;
    let newStock: number;
    let movementType: MovementType;

    if (adjustDto.type === 'in') {
      newStock = previousStock + adjustDto.quantity;
      movementType = MovementType.ADJUSTMENT_IN;
    } else if (adjustDto.type === 'out') {
      if (previousStock < adjustDto.quantity) {
        throw new BadRequestException('Stock insuficiente');
      }
      newStock = previousStock - adjustDto.quantity;
      movementType = MovementType.ADJUSTMENT_OUT;
    } else {
      // waste
      if (previousStock < adjustDto.quantity) {
        throw new BadRequestException('Stock insuficiente');
      }
      newStock = previousStock - adjustDto.quantity;
      movementType = MovementType.WASTE;
    }

    // Update product stock
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', adjustDto.productId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      throw new Error(`Error actualizando stock: ${updateError.message}`);
    }

    // Create movement record (unit_cost_at_time congela el costo vigente para valuación de merma)
    const { data: movement, error: movementError } = await this.supabase
      .from('inventory_movements')
      .insert({
        tenant_id: tenantId,
        product_id: adjustDto.productId,
        user_id: userId,
        type: movementType,
        quantity: adjustDto.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: adjustDto.reason,
        unit_cost_at_time: product.cost || 0,
      })
      .select()
      .single();

    if (movementError) {
      throw new Error(`Error registrando movimiento: ${movementError.message}`);
    }

    return {
      ...movement,
      product: { id: product.id, name: product.name },
    };
  }

  async getWasteSummary(tenantId: string, fromDate?: string, toDate?: string) {
    let query = this.supabase
      .from('inventory_movements')
      .select(`
        id, quantity, unit_cost_at_time, total_cost_impact, reason, created_at,
        product:products(id, name, code)
      `)
      .eq('tenant_id', tenantId)
      .eq('type', MovementType.WASTE)
      .order('created_at', { ascending: false });

    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate)   query = query.lte('created_at', toDate);

    const { data, error } = await query;
    if (error) throw new Error(`Error obteniendo merma: ${error.message}`);

    const totalUnits = data?.reduce((s, m) => s + (m.quantity || 0), 0) || 0;
    const totalCost  = data?.reduce((s, m) => s + (Number(m.total_cost_impact) || 0), 0) || 0;

    return { movements: data || [], totalUnits, totalCost };
  }

  async getLowStockProducts(tenantId: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, name, code, stock, min_stock, categories(name)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .not('min_stock', 'is', null)
      .order('stock');

    if (error) {
      throw new Error(`Error obteniendo productos: ${error.message}`);
    }

    // Filter products where stock <= min_stock
    return data?.filter((p) => p.stock <= p.min_stock) || [];
  }
}
