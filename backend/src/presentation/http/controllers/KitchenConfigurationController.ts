
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';

import { KitchenConfigurationService } from '../../../application/kitchen/KitchenConfigurationService';

import {
    CreateKitchenConfigurationDTO,
    UpdateKitchenConfigurationDTO,
} from '../../../application/kitchen/KitchenConfigurationDTOs';

import { KitchenConfigurationRecord } from '../../../application/kitchen/IKitchenConfigurationRepository';

import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { StatusGuard } from '../middlewares/UserStatus.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';

@Controller('kitchen-configurations')
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
export class KitchenConfigurationController {

    constructor(
        private readonly kitchenService: KitchenConfigurationService,
    ) {}

    private toResponse(configuration: KitchenConfigurationRecord) {

        return {
            id: configuration.id,
            name: configuration.name,
            jsonContent: configuration.json_content,
            isActive: configuration.is_active,
            createdAt: configuration.created_at,
            updatedAt: configuration.updated_at,
        };
    }

    @Get()
    @Roles(UserRole.MANAGER)
    async getAll() {

        const configurations = await this.kitchenService.getAll();

        return configurations.map(configuration =>
            this.toResponse(configuration),
        );
    }

    @Get('active')
    @Roles(UserRole.MANAGER, UserRole.EMPLOYEE)
    async getActive() {

        const configuration = await this.kitchenService.getActive();

        return this.toResponse(configuration);
    }

    @Get(':id')
    @Roles(UserRole.MANAGER)
    async getById(
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {

        const configuration = await this.kitchenService.getById(id);

        return this.toResponse(configuration);
    }

    @Post()
    @Roles(UserRole.MANAGER)
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: CreateKitchenConfigurationDTO,
    ) {

        const configuration = await this.kitchenService.create(
            body.name,
            body.jsonContent,
        );

        return this.toResponse(configuration);
    }

    @Put(':id')
    @Roles(UserRole.MANAGER)
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() body: UpdateKitchenConfigurationDTO,
    ) {

        const configuration = await this.kitchenService.update(
            id,
            body.name,
            body.jsonContent,
        );

        return this.toResponse(configuration);
    }

    @Delete(':id')
    @Roles(UserRole.MANAGER)
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {

        await this.kitchenService.delete(id);
    }

    @Post(':id/activate')
    @Roles(UserRole.MANAGER)
    async activate(
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {

        const configuration = await this.kitchenService.activate(id);

        return this.toResponse(configuration);
    }
}
