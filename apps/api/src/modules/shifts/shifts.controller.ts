import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { ClockOutDto } from './dto/clock-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('clock-in')
  @Roles(Role.SELLER, Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Iniciar turno del empleado actual' })
  async clockIn(@CurrentUser() user: CurrentUserData) {
    return this.shiftsService.clockIn(user.tenantId, user.id);
  }

  @Post('clock-out')
  @Roles(Role.SELLER, Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Cerrar turno del empleado actual' })
  async clockOut(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ClockOutDto,
  ) {
    return this.shiftsService.clockOut(user.tenantId, user.id, dto.notes);
  }

  @Get('my-shift')
  @Roles(Role.SELLER, Role.CASHIER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener turno activo del empleado actual' })
  async getMyActiveShift(@CurrentUser() user: CurrentUserData) {
    return this.shiftsService.getMyActiveShift(user.tenantId, user.id);
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar todos los turnos activos del tenant' })
  async getActiveShifts(@CurrentUser('tenantId') tenantId: string) {
    return this.shiftsService.getActiveShifts(tenantId);
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Historial de turnos cerrados' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async getShiftHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shiftsService.getShiftHistory(tenantId, fromDate, toDate, userId);
  }
}
