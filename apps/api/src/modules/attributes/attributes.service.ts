import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';

@Injectable()
export class AttributesService {
    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly supabase: SupabaseClient,
    ) { }

    async create(tenantId: string, dto: CreateAttributeDto) {
        const { data, error } = await this.supabase
            .from('product_attributes')
            .insert({
                tenant_id: tenantId,
                name: dto.name,
                display_order: dto.display_order || 0,
            })
            .select()
            .single();

        if (error) {
            throw new BadRequestException(`Error creating attribute: ${error.message}`);
        }

        return data;
    }

    async findAll(tenantId: string) {
        const { data, error } = await this.supabase
            .from('product_attributes')
            .select(`
        *,
        values:attribute_values(*)
      `)
            .eq('tenant_id', tenantId)
            .order('display_order', { ascending: true });

        if (error) {
            throw new BadRequestException(`Error fetching attributes: ${error.message}`);
        }

        return data || [];
    }

    async findOne(id: string, tenantId: string) {
        const { data, error } = await this.supabase
            .from('product_attributes')
            .select(`
        *,
        values:attribute_values(*)
      `)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Attribute not found`);
        }

        return data;
    }

    async update(id: string, tenantId: string, dto: UpdateAttributeDto) {
        const { data, error } = await this.supabase
            .from('product_attributes')
            .update({
                name: dto.name,
                display_order: dto.display_order,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException(`Attribute not found or update failed`);
        }

        return data;
    }

    async remove(id: string, tenantId: string) {
        // Check if attribute is in use
        const { data: variants } = await this.supabase
            .from('product_variants')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1);

        if (variants && variants.length > 0) {
            // Check if any variant uses this attribute
            const { data: attribute } = await this.supabase
                .from('product_attributes')
                .select('name')
                .eq('id', id)
                .single();

            if (attribute) {
                const { data: variantsUsingAttribute } = await this.supabase
                    .from('product_variants')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .filter('attributes', 'cs', `{"${attribute.name.toLowerCase()}":`)
                    .limit(1);

                if (variantsUsingAttribute && variantsUsingAttribute.length > 0) {
                    throw new BadRequestException(
                        'Cannot delete attribute that is in use by product variants',
                    );
                }
            }
        }

        const { error } = await this.supabase
            .from('product_attributes')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) {
            throw new BadRequestException(`Error deleting attribute: ${error.message}`);
        }

        return { message: 'Attribute deleted successfully' };
    }

    // Attribute Values
    async createValue(tenantId: string, dto: CreateAttributeValueDto) {
        // Verify attribute belongs to tenant
        const { data: attribute } = await this.supabase
            .from('product_attributes')
            .select('id')
            .eq('id', dto.attribute_id)
            .eq('tenant_id', tenantId)
            .single();

        if (!attribute) {
            throw new NotFoundException('Attribute not found');
        }

        const { data, error } = await this.supabase
            .from('attribute_values')
            .insert({
                attribute_id: dto.attribute_id,
                value: dto.value,
                display_order: dto.display_order || 0,
            })
            .select()
            .single();

        if (error) {
            throw new BadRequestException(`Error creating attribute value: ${error.message}`);
        }

        return data;
    }

    async removeValue(id: string, tenantId: string) {
        // Verify the value belongs to an attribute of this tenant
        const { data: value } = await this.supabase
            .from('attribute_values')
            .select(`
        id,
        attribute:product_attributes!inner(tenant_id)
      `)
            .eq('id', id)
            .single();

        if (!value || (value.attribute as any).tenant_id !== tenantId) {
            throw new NotFoundException('Attribute value not found');
        }

        const { error } = await this.supabase
            .from('attribute_values')
            .delete()
            .eq('id', id);

        if (error) {
            throw new BadRequestException(`Error deleting attribute value: ${error.message}`);
        }

        return { message: 'Attribute value deleted successfully' };
    }
}
