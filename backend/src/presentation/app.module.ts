import { UNAUTHORIZED_ATTEMPT_REPOSITORY } from '../application/auth/IUnauthorizedAttemptRepository';
import { PostgresUnauthorizedAttemptRepository } from '../infrastructure/persistence/repositories/PostgresUnauthorizedAttemptRepository';
import { Module } from '@nestjs/common';
import { HealthController } from './http/controllers/HealthController';
import { AuthModule } from './auth.module';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './global_exception.filter';
import { ConfigModule } from '@nestjs/config';
import { PizzaComponentTypeModule } from './pizza-component-type.module';
import { CategoryModule } from './category.module';
import { AllergenModule } from './allergen.module';
import { StockModule } from './stock.module';
import { PizzaSizeModule } from './pizza-size.module';
import { ProductModule } from './product.module';
import { ComponentSizeConfigurationModule } from './component-size-configuration.module';
import { UserModule } from './user.module';
import { PredefinedPizzaModule } from './predefined-pizza.module';
import { CatalogueModule } from './catalogue.module';
import { PlanningModule } from './planning.module';
import { KitchenModule } from './kitchen.module';
import { DocumentsModule } from './documents.module';
import { ImageModule } from './image.module';
import { AdminAuditController } from './http/controllers/AdminAuditController';
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		KitchenModule,
		AuthModule,
		UserModule,
		CategoryModule,
		PizzaComponentTypeModule,
		AllergenModule,
		StockModule,
		PizzaSizeModule,
		ProductModule,
		PredefinedPizzaModule,
		ComponentSizeConfigurationModule,
		CatalogueModule,
		PlanningModule,
		DocumentsModule,
		ImageModule,
	],
	controllers: [HealthController, AdminAuditController],
	providers: [
		{ provide: UNAUTHORIZED_ATTEMPT_REPOSITORY, useClass: PostgresUnauthorizedAttemptRepository },
		{
			provide: APP_FILTER,
			useClass: GlobalExceptionFilter,
		},
	],
})
export class AppModule {}
