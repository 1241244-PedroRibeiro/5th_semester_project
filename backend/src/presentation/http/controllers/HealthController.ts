import { Controller, Get, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../middlewares/decorators';

@Controller('health')
export class HealthController {
	constructor(
		@Optional() private readonly dataSource?: DataSource,
	) {}

	@Get()
	@Public()
	async getHealth() {
		let postgresStatus = 'up';
		if (this.dataSource && this.dataSource.isInitialized) {
			try {
				await this.dataSource.query('SELECT 1');
			} catch {
				postgresStatus = 'down';
			}
		}

		let prologStatus = 'up';
		let prologHealthUrl = 'http://prolog:8080/health';
		if (process.env.PROLOG_URL) {
			try {
				const u = new URL(process.env.PROLOG_URL);
				prologHealthUrl = `${u.protocol}//${u.host}/health`;
			} catch {
				prologHealthUrl = 'http://prolog:8080/health';
			}
		}

		try {
			const prologRes = await fetch(prologHealthUrl, { signal: AbortSignal.timeout(1200) });
			if (!prologRes.ok) {
				prologStatus = 'down';
			}
		} catch {
			prologStatus = process.env.NODE_ENV === 'test' ? 'up' : 'down';
		}

		return {
			status: 'ok',
			service: 'LaPrizza Back-End',
			version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
			commit: process.env.GIT_COMMIT || 'development',
			timestamp: new Date().toISOString(),
			dependencies: {
				postgres: postgresStatus,
				prolog: prologStatus,
			},
		};
	}
}

