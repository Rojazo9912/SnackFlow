import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_CASHIER = 'in_cashier',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: OrderStatus;
      userId?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    let query = this.supabase
      .from('orders')
      .select(
        `
        *,
        user:users!orders_user_id_fkey(id, name),
        cashier:users!orders_cashier_id_fkey(id, name),
        order_items(
          id,
          quantity,
          unit_price,
          subtotal,
          notes,
          product:products(id, name, code)
        )
      `,
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options?.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }

    if (options?.toDate) {
      query = query.lte('created_at', options.toDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo pedidos: ${error.message}`);
    }

    return data;
  }

  async findPending(tenantId: string) {
    return this.findAll(tenantId, { status: OrderStatus.PENDING });
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        user:users!orders_user_id_fkey(id, name),
        cashier:users!orders_cashier_id_fkey(id, name),
        order_items(
          id,
          quantity,
          unit_price,
          subtotal,
          notes,
          product:products(id, name, code, price)
        )
      `,
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return data;
  }

  async create(tenantId: string, userId: string, createOrderDto: CreateOrderDto) {
    // Calculate totals
    let subtotal = 0;
    const itemsWithPrices = [];

    for (const item of createOrderDto.items) {
      const { data: product } = await this.supabase
        .from('products')
        .select('id, price, name')
        .eq('id', item.productId)
        .eq('tenant_id', tenantId)
        .single();

      if (!product) {
        throw new BadRequestException(
          `Producto ${item.productId} no encontrado`,
        );
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      itemsWithPrices.push({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: itemSubtotal,
        notes: item.notes,
      });
    }

    // Create order
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        status: OrderStatus.PENDING,
        subtotal,
        total: subtotal,
        notes: createOrderDto.notes,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Error creando pedido: ${orderError.message}`);
    }

    // Create order items
    const orderItems = itemsWithPrices.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await this.supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback order
      await this.supabase.from('orders').delete().eq('id', order.id);
      throw new Error(`Error creando items del pedido: ${itemsError.message}`);
    }

    return this.findOne(order.id, tenantId);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    userId: string,
    updateStatusDto: UpdateOrderStatusDto,
  ) {
    const order = await this.findOne(id, tenantId);

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PENDING]: [OrderStatus.IN_CASHIER, OrderStatus.CANCELLED],
      [OrderStatus.IN_CASHIER]: [OrderStatus.PAID, OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status as OrderStatus]?.includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${order.status} a ${updateStatusDto.status}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: updateStatusDto.status,
      updated_at: new Date().toISOString(),
    };

    if (updateStatusDto.status === OrderStatus.IN_CASHIER) {
      updateData.cashier_id = userId;
    }

    if (updateStatusDto.status === OrderStatus.CANCELLED) {
      updateData.cancellation_reason = updateStatusDto.reason;
    }

    const { error } = await this.supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Error actualizando estado: ${error.message}`);
    }

    return this.findOne(id, tenantId);
  }

  async processPayment(
    id: string,
    tenantId: string,
    userId: string,
    paymentDto: ProcessPaymentDto,
  ) {
    const order = await this.findOne(id, tenantId);

    if (order.status !== OrderStatus.IN_CASHIER) {
      throw new BadRequestException('El pedido no esta en caja');
    }

    // Update order with payment info
    const { error: orderError } = await this.supabase
      .from('orders')
      .update({
        status: OrderStatus.PAID,
        payment_method: paymentDto.paymentMethod,
        payment_details: paymentDto.paymentDetails,
        cashier_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (orderError) {
      throw new Error(`Error procesando pago: ${orderError.message}`);
    }

    // Decrease stock for each item
    for (const item of order.order_items) {
      await this.supabase.rpc('decrease_stock', {
        p_product_id: item.product.id,
        p_quantity: item.quantity,
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_reason: `Venta - Pedido #${order.id.slice(0, 8)}`,
      });
    }

    return this.findOne(id, tenantId);
  }

  async cancel(id: string, tenantId: string, userId: string, reason: string) {
    return this.updateStatus(id, tenantId, userId, {
      status: OrderStatus.CANCELLED,
      reason,
    });
  }
}
