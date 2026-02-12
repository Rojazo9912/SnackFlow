import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { OpenCashDto } from './dto/open-cash.dto';
import { CloseCashDto } from './dto/close-cash.dto';
import { CashMovementDto } from './dto/cash-movement.dto';

export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum CashMovementType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

@Injectable()
export class CashRegisterService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async getCurrentSession(tenantId: string) {
    const { data, error } = await this.supabase
      .from('cash_sessions')
      .select('*, user:users(id, name)')
      .eq('tenant_id', tenantId)
      .eq('status', CashSessionStatus.OPEN)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error obteniendo sesion: ${error.message}`);
    }

    return data;
  }

  async openSession(tenantId: string, userId: string, openDto: OpenCashDto) {
    // Check if there's already an open session
    const currentSession = await this.getCurrentSession(tenantId);
    if (currentSession) {
      throw new BadRequestException('Ya hay una caja abierta');
    }

    const { data, error } = await this.supabase
      .from('cash_sessions')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        opening_amount: openDto.openingAmount,
        status: CashSessionStatus.OPEN,
        opened_at: new Date().toISOString(),
      })
      .select('*, user:users(id, name)')
      .single();

    if (error) {
      throw new Error(`Error abriendo caja: ${error.message}`);
    }

    return data;
  }

  async closeSession(tenantId: string, userId: string, closeDto: CloseCashDto) {
    const currentSession = await this.getCurrentSession(tenantId);
    if (!currentSession) {
      throw new BadRequestException('No hay caja abierta');
    }

    // Calculate expected amount
    const expectedAmount = await this.calculateExpectedAmount(
      tenantId,
      currentSession.id,
      currentSession.opening_amount,
    );

    const difference = closeDto.closingAmount - expectedAmount;

    const { data, error } = await this.supabase
      .from('cash_sessions')
      .update({
        closing_amount: closeDto.closingAmount,
        expected_amount: expectedAmount,
        difference,
        status: CashSessionStatus.CLOSED,
        closed_at: new Date().toISOString(),
      })
      .eq('id', currentSession.id)
      .select('*, user:users(id, name)')
      .single();

    if (error) {
      throw new Error(`Error cerrando caja: ${error.message}`);
    }

    return data;
  }

  private async calculateExpectedAmount(
    tenantId: string,
    sessionId: string,
    openingAmount: number,
  ): Promise<number> {
    // Get paid orders linked to this session (using orders table directly for consistency)
    const [ordersResult, movementsResult] = await Promise.all([
      this.supabase
        .from('orders')
        .select('id, total, payment_method, payment_details')
        .eq('tenant_id', tenantId)
        .eq('cash_register_session_id', sessionId)
        .eq('status', 'paid'),
      this.supabase
        .from('cash_movements')
        .select('type, amount')
        .eq('session_id', sessionId),
    ]);

    if (ordersResult.error) {
      throw new Error(`Error obteniendo pagos en efectivo: ${ordersResult.error.message}`);
    }

    // Calculate cash sales from orders
    let cashSales = 0;
    ordersResult.data?.forEach((o) => {
      if (o.payment_method === 'mixed' && o.payment_details) {
        let details: any = o.payment_details;
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch { details = null; }
        }
        if (details?.payments && Array.isArray(details.payments)) {
          details.payments.forEach((p: any) => {
            if (p.method === 'cash') {
              cashSales += p.amount || 0;
            }
          });
        }
      } else if (o.payment_method === 'cash') {
        cashSales += o.total || 0;
      }
    });

    // Calculate movements
    let movementsTotal = 0;
    movementsResult.data?.forEach((m) => {
      if (m.type === CashMovementType.DEPOSIT) {
        movementsTotal += m.amount;
      } else {
        movementsTotal -= m.amount;
      }
    });

    return openingAmount + cashSales + movementsTotal;
  }

  private async getSessionOpenedAt(sessionId: string): Promise<string> {
    const { data } = await this.supabase
      .from('cash_sessions')
      .select('opened_at')
      .eq('id', sessionId)
      .single();

    return data?.opened_at || new Date().toISOString();
  }

  async addMovement(
    tenantId: string,
    userId: string,
    movementDto: CashMovementDto,
  ) {
    const currentSession = await this.getCurrentSession(tenantId);
    if (!currentSession) {
      throw new BadRequestException('No hay caja abierta');
    }

    const { data, error } = await this.supabase
      .from('cash_movements')
      .insert({
        session_id: currentSession.id,
        type: movementDto.type,
        amount: movementDto.amount,
        reason: movementDto.reason,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error registrando movimiento: ${error.message}`);
    }

    return data;
  }

  async getSessionMovements(tenantId: string) {
    const currentSession = await this.getCurrentSession(tenantId);
    if (!currentSession) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', currentSession.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo movimientos: ${error.message}`);
    }

    return data;
  }

  async getSessionHistory(tenantId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('cash_sessions')
      .select('*, user:users(id, name)')
      .eq('tenant_id', tenantId)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error obteniendo historial: ${error.message}`);
    }

    return data;
  }
}

