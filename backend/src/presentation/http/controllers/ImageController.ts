import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ImageService, MAX_IMAGE_SIZE } from '../../../application/image/ImageService';
import { UploadedImageFile } from '../../../application/image/ImageDTOs';
import { UserRole } from '../../../application/user/UserRoles';
import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { StatusGuard } from '../middlewares/UserStatus.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Public, Roles } from '../middlewares/decorators';

@Controller('images')
export class ImageController {
	constructor(private readonly imageService: ImageService) {}

	/** Retrieves the picture of a product or pizza by its name or SKU (placeholder when missing). */
	@Get(':identifier')
	@Public()
	async getImage(@Param('identifier') identifier: string, @Res() res: Response): Promise<void> {
		const image = await this.imageService.getImage(identifier);
		res.setHeader('Content-Type', image.contentType);
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('Cache-Control', image.isPlaceholder ? 'no-cache' : 'public, max-age=300');
		res.setHeader('X-Image-Placeholder', String(image.isPlaceholder));
		if (image.contentType === 'image/svg+xml') {
			res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
		}
		res.status(HttpStatus.OK).send(image.content);
	}

	/** Uploads (or replaces) the picture of a product or pizza identified by name or SKU. */
	@Post(':identifier')
	@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
	@Roles(UserRole.MANAGER)
	@HttpCode(HttpStatus.CREATED)
	@UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } }))
	async uploadImage(
		@Param('identifier') identifier: string,
		@UploadedFile() file: UploadedImageFile | undefined,
	) {
		return this.imageService.saveImage(identifier, file);
	}
}
