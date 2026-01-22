import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CashRegisterService } from './cash-register.service';
import { OpenCashDto } from './dto/open-cash.dto';
import { CloseCashDto } from './dto/close-cash.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Cash Register')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('current')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener sesion de caja actual' })
  async getCurrentSession(@CurrentUser('tenantId') tenantId: string) {
    return this.cashRegisterService.getCurrentSession(tenantId);
  }

  @Post('open')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Abrir caja' })
  async openSession(
    @CurrentUser() user: CurrentUserData,
    @Body() openDto: OpenCashDto,
  ) {
    return this.cashRegisterService.openSession(user.tenantId, user.id, openDto);
  }

  @Post('close')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Cerrar caja' })
  async closeSession(
    @CurrentUser() user: CurrentUserData,
    @Body() closeDto: CloseCashDto,
  ) {
    return this.cashRegisterService.closeSession(user.tenantId, user.id, closeDto);
  }

  @Post('movement')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Registrar movimiento de caja (deposito/retiro)' })
  async addMovement(
    @CurrentUser() user: CurrentUserData,
    @Body() movementDto: CashMovementDto,
  ) {
    return this.cashRegisterService.addMovement(
      user.tenantId,
      user.id,
      movementDto,
    );
  }

  @Get('movements')
  @Roles(Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener movimientos de la sesion actual' })
  async getSessionMovements(@CurrentUser('tenantId') tenantId: string) {
    return this.cashRegisterService.getSessionMovements(tenantId);
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener historial de sesiones de caja' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSessionHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.cashRegisterService.getSessionHistory(tenantId, limit);
  }
}
