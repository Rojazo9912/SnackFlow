import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @Get('public/:slug')
  @Public()
  @ApiOperation({ summary: 'Obtener información pública del tenant por slug' })
  async getPublicTenant(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener informacion del tenant actual' })
  async getCurrentTenant(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Patch('current')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar informacion del tenant' })
  async updateCurrentTenant(
    @CurrentUser('tenantId') tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(tenantId, updateTenantDto);
  }

  @Get('current/settings')
  @ApiOperation({ summary: 'Obtener configuracion del tenant' })
  async getSettings(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.getSettings(tenantId);
  }

  @Patch('current/settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuracion del tenant' })
  async updateSettings(
    @CurrentUser('tenantId') tenantId: string,
    @Body() settings: Record<string, unknown>,
  ) {
    return this.tenantsService.updateSettings(tenantId, settings);
  }
}
