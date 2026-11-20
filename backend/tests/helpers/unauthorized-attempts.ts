import { IUnauthorizedAttemptRepository } from '../../src/application/auth/IUnauthorizedAttemptRepository';

export const testUnauthorizedAttempts: IUnauthorizedAttemptRepository & {
	entries: { user: string; timestamp: Date; endpoint: string }[];
} = {
	entries: [],
	async record(user: string, endpoint: string): Promise<void> {
		this.entries.push({ user, timestamp: new Date(), endpoint });
	},
	async findPage(page: number, pageSize: number) {
		const start = (page - 1) * pageSize;
		const items = this.entries
			.slice()
			.reverse()
			.slice(start, start + pageSize)
			.map((entry, index) => ({
				id: String(start + index + 1),
				user: entry.user,
				timestamp: entry.timestamp.toISOString(),
				endpoint: entry.endpoint,
			}));
		return { items, total: this.entries.length };
	},
	async findFilteredPage(filters: { page: number; pageSize: number; user?: string; from?: Date; to?: Date }) {
		const filtered = this.entries.filter((entry) =>
			(!filters.user || entry.user === filters.user) &&
			(!filters.from || entry.timestamp >= filters.from) &&
			(!filters.to || entry.timestamp < filters.to));
		const start = (filters.page - 1) * filters.pageSize;
		const items = filtered.slice().reverse().slice(start, start + filters.pageSize).map((entry, index) => ({
			id: String(start + index + 1),
			user: entry.user,
			timestamp: entry.timestamp.toISOString(),
			endpoint: entry.endpoint,
		}));
		return { items, total: filtered.length };
	},
};
