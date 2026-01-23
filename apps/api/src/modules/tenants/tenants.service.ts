import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) { }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return data;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const { data, error } = await this.supabase
      .from('tenants')
      .update(updateTenantDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando tenant: ${error.message}`);
    }

    return data;
  }

  async getSettings(id: string) {
    const tenant = await this.findOne(id);
    return tenant.settings || {};
  }

  async updateSettings(id: string, settings: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('tenants')
      .update({ settings })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando configuracion: ${error.message}`);
    }

    return data.settings;
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id, name, slug, settings')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Return only public information
    return {
      name: data.name,
      slug: data.slug,
      logo: data.settings?.logo || null,
    };
  }
}
