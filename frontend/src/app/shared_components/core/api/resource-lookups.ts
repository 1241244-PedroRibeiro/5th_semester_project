import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, expand, map, reduce } from 'rxjs';
import type { NamedResource, Page } from './models';

/** Shared public lookup requests for both customer forms and staff management pages. */
@Injectable({ providedIn: 'root' })
export class ResourceLookups {
	private readonly http = inject(HttpClient);
	page(path: string, page = 1, pageSize = 10, search?: string) {
		return this.http.get<Page<NamedResource> | NamedResource[]>(`/api/${path}`, {
			params: { page, pageSize, ...(search?.trim() ? { search: search.trim() } : {}) },
		});
	}
	all(path: string) {
		return this.page(path, 1, 100).pipe(
			expand((result) =>
				!Array.isArray(result) && result.page < result.totalPages
					? this.page(path, result.page + 1, 100)
					: EMPTY,
			),
			map((result) => (Array.isArray(result) ? result : result.items)),
			reduce((all, items) => [...all, ...items], [] as NamedResource[]),
		);
	}
}
