import dataSource from './data-source';
import { baselineDatabase } from './baseline';

async function main(): Promise<void> {
	await dataSource.initialize();
	try {
		await baselineDatabase(dataSource);
		console.log('Existing schema validated and initial TypeORM migration recorded. No application data was changed.');
	} finally { await dataSource.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
