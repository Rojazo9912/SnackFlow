import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async clockIn(tenantId: string, userId: string) {
    // Verificar turno activo previo
    const { data: active } = await this.supabase
      .from('employee_shifts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (active) {
      throw new BadRequestException('Ya tienes un turno activo. Ciérralo antes de iniciar uno nuevo.');
    }

    const { data, error } = await this.supabase
      .from('employee_shifts')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        clock_in: new Date().toISOString(),
      })
      .select('*, user:users(id, name, role)')
      .single();

    if (error) throw new Error(`Error iniciando turno: ${error.message}`);
    return data;
  }

  async clockOut(tenantId: string, userId: string, notes?: string) {
    const { data: active, error: findErr } = await this.supabase
      .from('employee_shifts')
      .select('id, clock_in')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (findErr || !active) {
      throw new BadRequestException('No hay turno activo para cerrar.');
    }

    const clockOut = new Date().toISOString();
    const durationMs = new Date(clockOut).getTime() - new Date(active.clock_in).getTime();
    const durationHours = Math.round((durationMs / 3600000) * 100) / 100;

    const { data, error } = await this.supabase
      .from('employee_shifts')
      .update({ clock_out: clockOut, notes: notes ?? null })
      .eq('id', active.id)
      .select('*, user:users(id, name, role)')
      .single();

    if (error) throw new Error(`Error cerrando turno: ${error.message}`);
    return { ...data, duration_hours: durationHours };
  }

  async getActiveShifts(tenantId: string) {
    const { data, error } = await this.supabase
      .from('active_shifts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('clock_in', { ascending: true });

    if (error) throw new Error(`Error obteniendo turnos activos: ${error.message}`);
    return data || [];
  }

  async getMyActiveShift(tenantId: string, userId: string) {
    const { data } = await this.supabase
      .from('employee_shifts')
      .select('id, clock_in, notes')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();

    if (!data) return null;

    const durationMs = Date.now() - new Date(data.clock_in).getTime();
    return {
      ...data,
      duration_hours: Math.round((durationMs / 3600000) * 100) / 100,
    };
  }

  async getShiftHistory(tenantId: string, fromDate?: string, toDate?: string, userId?: string) {
    let query = this.supabase
      .from('employee_shifts')
      .select('*, user:users(id, name, role)')
      .eq('tenant_id', tenantId)
      .not('clock_out', 'is', null)
      .order('clock_in', { ascending: false })
      .limit(100);

    if (fromDate) query = query.gte('clock_in', `${fromDate}T00:00:00`);
    if (toDate)   query = query.lte('clock_in', `${toDate}T23:59:59`);
    if (userId)   query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw new Error(`Error obteniendo historial: ${error.message}`);

    return (data || []).map((s) => {
      const durationMs = new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime();
      return { ...s, duration_hours: Math.round((durationMs / 3600000) * 100) / 100 };
    });
  }
}
