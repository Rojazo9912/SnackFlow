import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findAll(tenantId: string, includeInactive = false) {
    let query = this.supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position');

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo categorias: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Categoria no encontrada');
    }

    return data;
  }

  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    // Get max position
    const { data: maxPos } = await this.supabase
      .from('categories')
      .select('position')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = (maxPos?.position || 0) + 1;

    const { data, error } = await this.supabase
      .from('categories')
      .insert({
        tenant_id: tenantId,
        name: createCategoryDto.name,
        position,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando categoria: ${error.message}`);
    }

    return data;
  }

  async update(id: string, tenantId: string, updateCategoryDto: UpdateCategoryDto) {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updateCategoryDto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando categoria: ${error.message}`);
    }

    return data;
  }

  async toggleActive(id: string, tenantId: string) {
    const category = await this.findOne(id, tenantId);

    const { data, error } = await this.supabase
      .from('categories')
      .update({ active: !category.active })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error cambiando estado de categoria: ${error.message}`);
    }

    return data;
  }

  async reorder(tenantId: string, categoryIds: string[]) {
    const updates = categoryIds.map((id, index) =>
      this.supabase
        .from('categories')
        .update({ position: index + 1 })
        .eq('id', id)
        .eq('tenant_id', tenantId),
    );

    await Promise.all(updates);

    return this.findAll(tenantId, true);
  }
}
