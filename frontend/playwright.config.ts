import { defineConfig } from '@playwright/test';

const port = Number(process.env['PLAYWRIGHT_PORT'] ?? 4200);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	workers: 2,
	reporter: 'list',
	use: {
		baseURL,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: `npm start -- --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env['CI'],
	},
});
