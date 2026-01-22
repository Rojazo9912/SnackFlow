import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePinDto } from './dto/update-pin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar todos los usuarios del tenant' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findOne(id, tenantId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, createUserDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, tenantId, updateUserDto);
  }

  @Patch(':id/pin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar el PIN de un usuario' })
  async updatePin(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() updatePinDto: UpdatePinDto,
  ) {
    return this.usersService.updatePin(id, tenantId, updatePinDto.pin);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar un usuario' })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.toggleActive(id, tenantId);
  }
}
