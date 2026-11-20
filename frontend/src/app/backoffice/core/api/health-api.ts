import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface HealthResponse {
	status: string;
	service: string;
	timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class HealthApi {
	private readonly http = inject(HttpClient);

	getHealth() {
		return this.http.get<HealthResponse>('/api/health');
	}
}
