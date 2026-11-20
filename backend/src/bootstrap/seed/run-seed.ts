import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../presentation/app.module';
import { seedDatabase } from './seed';
import { resolveSeedServices } from './seed-services';

/** Boots the backend without HTTP and seeds through its application services. Run after migrations. */
async function main(): Promise<void> {
	const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
	try {
		await seedDatabase(resolveSeedServices(app));
		console.log('Development seed completed.');
	} finally {
		await app.close();
	}
}

main().catch(error => { console.error(error); process.exitCode = 1; });
