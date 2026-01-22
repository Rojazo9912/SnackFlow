import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      categoryId?: string;
      search?: string;
      includeInactive?: boolean;
      favoritesOnly?: boolean;
    },
  ) {
    let query = this.supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('tenant_id', tenantId)
      .order('name');

    if (!options?.includeInactive) {
      query = query.eq('active', true);
    }

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.search) {
      query = query.or(
        `name.ilike.%${options.search}%,code.ilike.%${options.search}%`,
      );
    }

    if (options?.favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo productos: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Producto no encontrado');
    }

    return data;
  }

  async findByCode(code: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('code', code)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Producto no encontrado');
    }

    return data;
  }

  async create(tenantId: string, createProductDto: CreateProductDto) {
    const { data, error } = await this.supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        ...createProductDto,
        stock: createProductDto.stock || 0,
        active: true,
        is_favorite: createProductDto.isFavorite || false,
      })
      .select('*, categories(id, name)')
      .single();

    if (error) {
      throw new Error(`Error creando producto: ${error.message}`);
    }

    return data;
  }

  async update(id: string, tenantId: string, updateProductDto: UpdateProductDto) {
    const updateData: Record<string, unknown> = { ...updateProductDto };
    if (updateProductDto.isFavorite !== undefined) {
      updateData.is_favorite = updateProductDto.isFavorite;
      delete updateData.isFavorite;
    }

    const { data, error } = await this.supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      throw new Error(`Error actualizando producto: ${error.message}`);
    }

    return data;
  }

  async toggleActive(id: string, tenantId: string) {
    const product = await this.findOne(id, tenantId);

    const { data, error } = await this.supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      throw new Error(`Error cambiando estado del producto: ${error.message}`);
    }

    return data;
  }

  async toggleFavorite(id: string, tenantId: string) {
    const product = await this.findOne(id, tenantId);

    const { data, error } = await this.supabase
      .from('products')
      .update({ is_favorite: !product.is_favorite })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, categories(id, name)')
      .single();

    if (error) {
      throw new Error(`Error cambiando favorito: ${error.message}`);
    }

    return data;
  }

  async getLowStock(tenantId: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .not('min_stock', 'is', null)
      .filter('stock', 'lte', 'min_stock');

    if (error) {
      throw new Error(`Error obteniendo productos con bajo stock: ${error.message}`);
    }

    return data;
  }
}
