import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { SupervisorAuthorizeDto } from './dto/supervisor-authorize.dto';

@Injectable()
export class SupervisorAuthService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async verifyAndAuthorize(
    tenantId: string,
    requestingUserId: string,
    dto: SupervisorAuthorizeDto,
  ) {
    // Buscar supervisor por PIN dentro del tenant con rol suficiente
    const { data: supervisor } = await this.supabase
      .from('users')
      .select('id, name, role')
      .eq('tenant_id', tenantId)
      .eq('pin', dto.supervisorPin)
      .eq('active', true)
      .in('role', ['supervisor', 'admin'])
      .maybeSingle();

    if (!supervisor) {
      throw new BadRequestException('PIN de supervisor inválido o sin permisos suficientes.');
    }

    // Registrar log de autorización (inmutable)
    const { data: authLog, error } = await this.supabase
      .from('supervisor_authorizations')
      .insert({
        tenant_id: tenantId,
        supervisor_id: supervisor.id,
        requesting_user_id: requestingUserId,
        action_type: dto.actionType,
        reference_id: dto.referenceId ?? null,
        reference_table: dto.referenceTable ?? null,
        metadata: dto.metadata ?? {},
      })
      .select('id, authorized_at')
      .single();

    if (error) throw new Error(`Error registrando autorización: ${error.message}`);

    return {
      authorized: true,
      supervisor: { id: supervisor.id, name: supervisor.name, role: supervisor.role },
      authorizationId: authLog.id,
      authorizedAt: authLog.authorized_at,
    };
  }

  async getAuthorizationHistory(tenantId: string, fromDate?: string, toDate?: string) {
    let query = this.supabase
      .from('supervisor_authorizations')
      .select(`
        id, action_type, reference_id, reference_table, metadata, authorized_at,
        supervisor:users!supervisor_authorizations_supervisor_id_fkey(id, name, role),
        requesting_user:users!supervisor_authorizations_requesting_user_id_fkey(id, name)
      `)
      .eq('tenant_id', tenantId)
      .order('authorized_at', { ascending: false })
      .limit(200);

    if (fromDate) query = query.gte('authorized_at', `${fromDate}T00:00:00`);
    if (toDate)   query = query.lte('authorized_at', `${toDate}T23:59:59`);

    const { data, error } = await query;
    if (error) throw new Error(`Error obteniendo historial: ${error.message}`);
    return data || [];
  }
}
