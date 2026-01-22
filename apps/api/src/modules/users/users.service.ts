import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, name, role, active, created_at')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw new Error(`Error obteniendo usuarios: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, name, role, active, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return data;
  }

  async create(tenantId: string, createUserDto: CreateUserDto) {
    // Create auth user in Supabase
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: createUserDto.email,
        password: createUserDto.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes('already')) {
        throw new ConflictException('El email ya esta registrado');
      }
      throw new Error(`Error creando usuario: ${authError.message}`);
    }

    // Create user profile
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenantId,
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role,
        pin: createUserDto.pin,
        active: true,
      })
      .select('id, email, name, role, active, created_at')
      .single();

    if (error) {
      // Rollback: delete auth user
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Error creando perfil de usuario: ${error.message}`);
    }

    return data;
  }

  async update(id: string, tenantId: string, updateUserDto: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updateUserDto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, email, name, role, active, created_at')
      .single();

    if (error) {
      throw new Error(`Error actualizando usuario: ${error.message}`);
    }

    return data;
  }

  async updatePin(id: string, tenantId: string, pin: string) {
    const { error } = await this.supabase
      .from('users')
      .update({ pin })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Error actualizando PIN: ${error.message}`);
    }

    return { message: 'PIN actualizado exitosamente' };
  }

  async toggleActive(id: string, tenantId: string) {
    const user = await this.findOne(id, tenantId);

    const { data, error } = await this.supabase
      .from('users')
      .update({ active: !user.active })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, email, name, role, active')
      .single();

    if (error) {
      throw new Error(`Error cambiando estado del usuario: ${error.message}`);
    }

    return data;
  }
}
