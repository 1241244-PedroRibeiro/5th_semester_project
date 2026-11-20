import { Module } from '@nestjs/common';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module';
import { ImageController } from './http/controllers/ImageController';
import { ImageService } from '../application/image/ImageService';
import { IMAGE_STORAGE } from '../application/image/IImageStorage';
import { FileSystemImageStorage, picturesDirectory } from '../infrastructure/storage/FileSystemImageStorage';
import { AuthModule } from './auth.module';
import { RolesGuard } from './http/middlewares/roles.guard';
import { ProductModule } from './product.module';
import { PredefinedPizzaModule } from './predefined-pizza.module';

@Module({
	imports: [PersistenceModule, AuthModule, ProductModule, PredefinedPizzaModule],
	controllers: [ImageController],
	providers: [
		ImageService,
		RolesGuard,
		{ provide: IMAGE_STORAGE, useFactory: () => new FileSystemImageStorage(picturesDirectory()) },
	],
	exports: [ImageService],
})
export class ImageModule {}
