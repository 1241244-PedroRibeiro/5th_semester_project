import { Injectable, Logger } from '@nestjs/common';
import { PrologRequestDTO, PrologResponseDTO } from '../../application/planning/PlanningDTOs';

export const PROLOG_HTTP_CLIENT = 'PrologHttpClient';

@Injectable()
export class PrologHttpClient {
    private readonly logger = new Logger(PrologHttpClient.name);
    private readonly timeoutMs = 15_000;

    async execute(payload: PrologRequestDTO): Promise<PrologResponseDTO> {
        // Forçamos o URL interno do Docker para ignorar o .env que pode estar errado
        const url = 'http://prolog:8080/api/v1/plan';
        
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            
            if (!response.ok) {
                throw new Error(`Prolog HTTP ${response.status}: ${await response.text()}`);
            }
            
            return (await response.json()) as PrologResponseDTO;
        } catch (err: any) {
            // Imprime a causa exata (ex: ECONNREFUSED, ENOTFOUND) em vez de apenas "fetch failed"
            const causeMsg = err.cause ? (err.cause.message || String(err.cause)) : 'sem causa detalhada';
            this.logger.error(`Prolog call failed: ${err.message} | CAUSA REAL: ${causeMsg}`);
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }
}