import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database-options';

@Global()
@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRootAsync({
		useFactory: () => ({ ...databaseOptions(), retryAttempts: 1 }),
	})],
	exports: [TypeOrmModule],
})
export class PersistenceModule {}
