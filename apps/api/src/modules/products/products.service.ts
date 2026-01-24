import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductIngredientDto } from './dto/product-ingredient.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) { }

  async findAll(
    tenantId: string,
    options?: {
      categoryId?: string;
      search?: string;
      includeInactive?: boolean;
      favoritesOnly?: boolean;
      calculateCompositeStock?: boolean;
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

    // Calculate stock for composite products
    if (options?.calculateCompositeStock && data) {
      for (const product of data) {
        if (product.is_composite) {
          const { data: calcStock } = await this.supabase.rpc('calculate_composite_stock', {
            p_product_id: product.id,
            p_tenant_id: tenantId,
          });
          product.calculated_stock = calcStock ?? 0;
        }
      }
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
    const { ingredients, isFavorite, isComposite, categoryId, minStock, imageUrl, ...rest } = createProductDto;

    const { data, error } = await this.supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        ...rest,
        category_id: categoryId,
        min_stock: minStock,
        image_url: imageUrl,
        stock: isComposite ? 0 : (createProductDto.stock || 0),
        active: true,
        is_favorite: isFavorite || false,
        is_composite: isComposite || false,
      })
      .select('*, categories(id, name)')
      .single();

    if (error) {
      throw new Error(`Error creando producto: ${error.message}`);
    }

    // If composite, add ingredients
    if (isComposite && ingredients?.length) {
      await this.setProductIngredients(tenantId, data.id, ingredients);
    }

    return data;
  }

  async update(id: string, tenantId: string, updateProductDto: UpdateProductDto) {
    const { ingredients, isFavorite, isComposite, categoryId, minStock, imageUrl, ...rest } = updateProductDto;

    const updateData: Record<string, unknown> = { ...rest };

    if (isFavorite !== undefined) {
      updateData.is_favorite = isFavorite;
    }
    if (isComposite !== undefined) {
      updateData.is_composite = isComposite;
      // If becoming composite, set stock to 0
      if (isComposite) {
        updateData.stock = 0;
      }
    }
    if (categoryId !== undefined) {
      updateData.category_id = categoryId;
    }
    if (minStock !== undefined) {
      updateData.min_stock = minStock;
    }
    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl;
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

    // Update ingredients if provided
    if (ingredients !== undefined) {
      if (isComposite || data.is_composite) {
        await this.setProductIngredients(tenantId, id, ingredients);
      } else {
        // If no longer composite, remove ingredients
        await this.removeProductIngredients(tenantId, id);
      }
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

  // ==========================================
  // INGREDIENT METHODS (for composite products)
  // ==========================================

  async getProductIngredients(tenantId: string, productId: string) {
    const { data, error } = await this.supabase
      .from('product_ingredients')
      .select(`
        id,
        quantity,
        ingredient:products!ingredient_id(id, name, code, stock, unit, is_composite)
      `)
      .eq('product_id', productId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Error obteniendo ingredientes: ${error.message}`);
    }

    return data || [];
  }

  async setProductIngredients(
    tenantId: string,
    productId: string,
    ingredients: ProductIngredientDto[],
  ) {
    // Validate no circular references
    await this.validateNoCircularReference(tenantId, productId, ingredients);

    // Remove existing ingredients
    await this.removeProductIngredients(tenantId, productId);

    // Insert new ingredients
    if (ingredients.length > 0) {
      const ingredientRecords = ingredients.map((ing) => ({
        tenant_id: tenantId,
        product_id: productId,
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
      }));

      const { error } = await this.supabase
        .from('product_ingredients')
        .insert(ingredientRecords);

      if (error) {
        throw new Error(`Error agregando ingredientes: ${error.message}`);
      }
    }

    return this.getProductIngredients(tenantId, productId);
  }

  async removeProductIngredients(tenantId: string, productId: string) {
    const { error } = await this.supabase
      .from('product_ingredients')
      .delete()
      .eq('product_id', productId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Error eliminando ingredientes: ${error.message}`);
    }
  }

  async validateNoCircularReference(
    tenantId: string,
    productId: string,
    ingredients: ProductIngredientDto[],
    visited: Set<string> = new Set(),
  ) {
    if (visited.has(productId)) {
      throw new BadRequestException('Referencia circular detectada en ingredientes');
    }
    visited.add(productId);

    for (const ing of ingredients) {
      // Check ingredient is not the product itself
      if (ing.ingredientId === productId) {
        throw new BadRequestException('Un producto no puede ser ingrediente de si mismo');
      }

      // If ingredient is composite, check its ingredients recursively
      const { data: ingredient } = await this.supabase
        .from('products')
        .select('is_composite')
        .eq('id', ing.ingredientId)
        .eq('tenant_id', tenantId)
        .single();

      if (ingredient?.is_composite) {
        const subIngredients = await this.getProductIngredients(tenantId, ing.ingredientId);
        await this.validateNoCircularReference(
          tenantId,
          productId,
          subIngredients.map((si: any) => ({
            ingredientId: si.ingredient?.id || si.ingredient?.[0]?.id,
            quantity: si.quantity,
          })),
          new Set(visited),
        );
      }
    }
  }

  async calculateCompositeStock(tenantId: string, productId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_composite_stock', {
      p_product_id: productId,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Error calculando stock: ${error.message}`);
    }

    return data ?? 0;
  }

  // ==========================================
  // VARIANT METHODS (for products with variants)
  // ==========================================

  async getVariants(productId: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .order('created_at');

    if (error) {
      throw new BadRequestException(`Error fetching variants: ${error.message}`);
    }

    return data || [];
  }

  async createVariant(productId: string, tenantId: string, dto: CreateVariantDto) {
    // Verify product exists and belongs to tenant
    await this.findOne(productId, tenantId);

    // Generate SKU if not provided
    const sku = dto.sku || `${productId.substring(0, 8)}-${Date.now()}`;

    const { data, error } = await this.supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        tenant_id: tenantId,
        sku,
        price: dto.price,
        stock: dto.stock,
        min_stock: dto.min_stock || 0,
        attributes: dto.attributes,
        active: dto.active !== undefined ? dto.active : true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error creating variant: ${error.message}`);
    }

    return data;
  }

  async updateVariant(variantId: string, tenantId: string, dto: UpdateVariantDto) {
    const updateData: any = {};

    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.stock !== undefined) updateData.stock = dto.stock;
    if (dto.min_stock !== undefined) updateData.min_stock = dto.min_stock;
    if (dto.attributes !== undefined) updateData.attributes = dto.attributes;
    if (dto.active !== undefined) updateData.active = dto.active;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('product_variants')
      .update(updateData)
      .eq('id', variantId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Variant not found or update failed`);
    }

    return data;
  }

  async deleteVariant(variantId: string, tenantId: string) {
    // Check if variant is in use in pending orders
    const { data: orderItems } = await this.supabase
      .from('order_items')
      .select('id, order:orders!inner(status)')
      .eq('variant_id', variantId)
      .in('order.status', ['pending', 'preparing'])
      .limit(1);

    if (orderItems && orderItems.length > 0) {
      throw new BadRequestException(
        'Cannot delete variant that is in use by pending orders',
      );
    }

    const { error } = await this.supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new BadRequestException(`Error deleting variant: ${error.message}`);
    }

    return { message: 'Variant deleted successfully' };
  }

  async getVariantStock(variantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('product_variants')
      .select('stock')
      .eq('id', variantId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.stock;
  }

  async decrementVariantStock(variantId: string, quantity: number) {
    const currentStock = await this.getVariantStock(variantId);

    if (currentStock < quantity) {
      throw new BadRequestException('Insufficient variant stock');
    }

    const { error } = await this.supabase
      .from('product_variants')
      .update({ stock: currentStock - quantity })
      .eq('id', variantId);

    if (error) {
      throw new BadRequestException(`Error updating variant stock: ${error.message}`);
    }
  }
}
