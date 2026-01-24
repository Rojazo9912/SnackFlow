import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attributes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('attributes')
export class AttributesController {
    constructor(private readonly attributesService: AttributesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new product attribute' })
    create(
        @CurrentUser('tenantId') tenantId: string,
        @Body() createAttributeDto: CreateAttributeDto,
    ) {
        return this.attributesService.create(tenantId, createAttributeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all product attributes with their values' })
    findAll(@CurrentUser('tenantId') tenantId: string) {
        return this.attributesService.findAll(tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single attribute with its values' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.attributesService.findOne(id, tenantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an attribute' })
    update(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body() updateAttributeDto: UpdateAttributeDto,
    ) {
        return this.attributesService.update(id, tenantId, updateAttributeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an attribute' })
    remove(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.attributesService.remove(id, tenantId);
    }

    // Attribute Values
    @Post('values')
    @ApiOperation({ summary: 'Create a new attribute value' })
    createValue(
        @CurrentUser('tenantId') tenantId: string,
        @Body() createValueDto: CreateAttributeValueDto,
    ) {
        return this.attributesService.createValue(tenantId, createValueDto);
    }

    @Delete('values/:id')
    @ApiOperation({ summary: 'Delete an attribute value' })
    removeValue(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.attributesService.removeValue(id, tenantId);
    }
}
