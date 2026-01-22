import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'favoritesOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'calculateCompositeStock', required: false, type: Boolean })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('favoritesOnly') favoritesOnly?: boolean,
    @Query('calculateCompositeStock') calculateCompositeStock?: boolean,
  ) {
    return this.productsService.findAll(tenantId, {
      categoryId,
      search,
      includeInactive,
      favoritesOnly,
      calculateCompositeStock,
    });
  }

  @Get('low-stock')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar productos con stock bajo' })
  async getLowStock(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getLowStock(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.findOne(id, tenantId);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Obtener un producto por codigo' })
  async findByCode(
    @Param('code') code: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.findByCode(code, tenantId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, createProductDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un producto' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, tenantId, updateProductDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar un producto' })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.toggleActive(id, tenantId);
  }

  @Patch(':id/toggle-favorite')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Marcar/desmarcar como favorito' })
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.toggleFavorite(id, tenantId);
  }

  // ==========================================
  // INGREDIENT ENDPOINTS (for composite products)
  // ==========================================

  @Get(':id/ingredients')
  @ApiOperation({ summary: 'Obtener ingredientes de un producto compuesto' })
  async getIngredients(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.getProductIngredients(tenantId, id);
  }

  @Patch(':id/ingredients')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar ingredientes de un producto compuesto' })
  async updateIngredients(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { ingredients: { ingredientId: string; quantity: number }[] },
  ) {
    return this.productsService.setProductIngredients(tenantId, id, body.ingredients);
  }

  @Get(':id/calculated-stock')
  @ApiOperation({ summary: 'Obtener stock calculado de un producto compuesto' })
  async getCalculatedStock(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const stock = await this.productsService.calculateCompositeStock(tenantId, id);
    return { calculatedStock: stock };
  }
}
