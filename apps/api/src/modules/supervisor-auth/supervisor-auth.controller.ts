import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupervisorAuthService } from './supervisor-auth.service';
import { SupervisorAuthorizeDto } from './dto/supervisor-authorize.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Supervisor Auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supervisor-auth')
export class SupervisorAuthController {
  constructor(private readonly supervisorAuthService: SupervisorAuthService) {}

  @Post('authorize')
  @Roles(Role.SELLER, Role.CASHIER, Role.SUPERVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Verificar PIN de supervisor y registrar autorización' })
  async authorize(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SupervisorAuthorizeDto,
  ) {
    return this.supervisorAuthService.verifyAndAuthorize(user.tenantId, user.id, dto);
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Historial de autorizaciones de supervisor' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.supervisorAuthService.getAuthorizationHistory(tenantId, fromDate, toDate);
  }
}
