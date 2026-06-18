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
import { BlindCountDto, CloseBlindDto, DenominationDto } from './dto/blind-count.dto';

const BLIND_COUNT_TOLERANCE_MXN = 50;

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

  // ── Arqueo Ciego ─────────────────────────────────────────────────

  async submitBlindCount(tenantId: string, blindCountDto: BlindCountDto) {
    const session = await this.getCurrentSession(tenantId);
    if (!session) throw new BadRequestException('No hay caja abierta.');

    // Eliminar conteo previo si existe (el cajero puede rehacer el conteo)
    await this.supabase
      .from('cash_blind_count_detail')
      .delete()
      .eq('session_id', session.id);

    // Insertar denominaciones
    const details = blindCountDto.denominations.map((d: DenominationDto) => ({
      session_id: session.id,
      denomination: d.denomination,
      quantity: d.quantity,
    }));

    if (details.length > 0) {
      const { error } = await this.supabase
        .from('cash_blind_count_detail')
        .insert(details);
      if (error) throw new Error(`Error guardando conteo: ${error.message}`);
    }

    const blindTotal = blindCountDto.denominations.reduce(
      (sum, d) => sum + d.denomination * d.quantity,
      0,
    );

    // Guardar el total del conteo ciego (sin mostrar el esperado al cajero)
    await this.supabase
      .from('cash_sessions')
      .update({ blind_count: blindTotal })
      .eq('id', session.id);

    return {
      sessionId: session.id,
      blindTotal: Math.round(blindTotal * 100) / 100,
      message: 'Conteo registrado. Confirma el cierre para ver el resultado.',
    };
  }

  async closeSessionBlind(tenantId: string, userId: string, closeDto: CloseBlindDto) {
    const session = await this.getCurrentSession(tenantId);
    if (!session) throw new BadRequestException('No hay caja abierta.');

    if (session.blind_count === null || session.blind_count === undefined) {
      throw new BadRequestException(
        'Primero debes realizar el arqueo ciego antes de cerrar la caja.',
      );
    }

    const expected = await this.calculateExpectedAmount(
      tenantId,
      session.id,
      session.opening_amount,
    );

    const blindDifference = Math.round((session.blind_count - expected) * 100) / 100;
    const absDeviation = Math.abs(blindDifference);

    // Descuadre superior a tolerancia requiere PIN de supervisor
    if (absDeviation > BLIND_COUNT_TOLERANCE_MXN) {
      if (!closeDto.supervisorPin) {
        throw new BadRequestException(
          `Descuadre de $${absDeviation.toFixed(2)} supera el límite de $${BLIND_COUNT_TOLERANCE_MXN}. Se requiere autorización de supervisor.`,
        );
      }

      // Verificar PIN de supervisor directamente (sin importar SupervisorAuthModule para evitar circular dep)
      const { data: supervisor } = await this.supabase
        .from('users')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('pin', closeDto.supervisorPin)
        .eq('active', true)
        .in('role', ['supervisor', 'admin'])
        .maybeSingle();

      if (!supervisor) {
        throw new BadRequestException('PIN de supervisor inválido.');
      }

      // Registrar log de autorización
      await this.supabase.from('supervisor_authorizations').insert({
        tenant_id: tenantId,
        supervisor_id: supervisor.id,
        requesting_user_id: userId,
        action_type: 'cash_discrepancy',
        reference_id: session.id,
        reference_table: 'cash_sessions',
        metadata: {
          expected,
          blind_count: session.blind_count,
          difference: blindDifference,
        },
      });
    }

    const { data, error } = await this.supabase
      .from('cash_sessions')
      .update({
        closing_amount: session.blind_count,
        expected_amount: expected,
        blind_difference: blindDifference,
        close_notes: closeDto.closeNotes ?? null,
        status: CashSessionStatus.CLOSED,
        closed_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select('*, user:users(id, name)')
      .single();

    if (error) throw new Error(`Error cerrando caja: ${error.message}`);

    return {
      ...data,
      expected_amount: expected,
      blind_difference: blindDifference,
      requires_justification: absDeviation > BLIND_COUNT_TOLERANCE_MXN,
    };
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

