import { Module } from '@nestjs/common';
import { DocumentsController } from './http/controllers/DocumentsController';
import { AuthModule } from './auth.module';

@Module({
	imports: [AuthModule],
	controllers: [DocumentsController],
})
export class DocumentsModule {}