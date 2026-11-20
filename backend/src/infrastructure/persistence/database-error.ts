/** Preserve existing domain/API error handling when TypeORM wraps a PostgreSQL error. */
export function databaseErrorCode(error: unknown): string | undefined {
	const value = error as { code?: string; driverError?: { code?: string } } | null;
	return value?.driverError?.code ?? value?.code;
}
