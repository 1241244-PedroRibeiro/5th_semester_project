import { DataSource } from 'typeorm';
import * as entities from '../../src/infrastructure/persistence/entities';

// HTTP contract tests replace their repositories; this provider prevents opening a database connection.
export const mockDataSource = new DataSource({ type: 'postgres', entities: Object.values(entities) });
