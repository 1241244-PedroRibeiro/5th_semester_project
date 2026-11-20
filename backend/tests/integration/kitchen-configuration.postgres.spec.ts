
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';

import {
  createTestDatabase,
  postgres,
} from '../helpers/postgres';

import { KitchenConfigurationEntity } from '../../src/infrastructure/persistence/entities/KitchenConfigurationEntity';

import { PostgresKitchenConfigurationRepository } from '../../src/infrastructure/persistence/repositories/PostgresKitchenConfigurationRepository';

postgres('PostgresKitchenConfigurationRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let source: DataSource;
  let repository: PostgresKitchenConfigurationRepository;

  const json = {
    schemaVersion: '1.0',
    equipment: [],
    dimensions: {
      width: 10,
      length: 12,
      height: 3,
    },
  };

  const create = (name: string) =>
    repository.create({
      name,
      json_content: json,
    });

  beforeAll(async () => {
    database = await createTestDatabase(false);
    source = database.dataSource;

    repository = new PostgresKitchenConfigurationRepository(source);
  });

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await source
      .getRepository(KitchenConfigurationEntity)
      .clear();
  });

  it('creates configurations as inactive and persists their JSON', async () => {
    const saved = await create('Kitchen A');

    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe('Kitchen A');
    expect(saved.json_content).toEqual(json);
    expect(saved.is_active).toBe(false);
  });

  it('lists configurations alphabetically by name', async () => {
    await create('Zulu');
    await create('Alpha');
    await create('Middle');

    const result = await repository.findAll();

    expect(result.map(item => item.name)).toEqual([
      'Alpha',
      'Middle',
      'Zulu',
    ]);
  });

  it('finds configurations by ID and name', async () => {
    const saved = await create('Kitchen A');

    expect(
      (await repository.findById(saved.id))?.name,
    ).toBe('Kitchen A');

    expect(
      (await repository.findByName('Kitchen A'))?.id,
    ).toBe(saved.id);

    await expect(
      repository.findById(randomUUID()),
    ).resolves.toBeNull();

    await expect(
      repository.findByName('Missing'),
    ).resolves.toBeNull();
  });

  it('returns null when there is no active configuration', async () => {
    await create('Kitchen A');

    await expect(
      repository.findActive(),
    ).resolves.toBeNull();
  });

  it('updates name and JSON content', async () => {
    const saved = await create('Kitchen A');

    const updatedJson = {
      ...json,
      equipment: [{ id: 'oven-1' }],
    };

    const updated = await repository.update({
      id: saved.id,
      name: 'Kitchen Updated',
      json_content: updatedJson,
    });

    expect(updated?.name).toBe('Kitchen Updated');
    expect(updated?.json_content).toEqual(updatedJson);

    await expect(
      repository.update({
        id: randomUUID(),
        name: 'Missing',
        json_content: json,
      }),
    ).resolves.toBeNull();
  });

  it('deletes an inactive configuration', async () => {
    const saved = await create('Kitchen A');

    await expect(
      repository.delete(saved.id),
    ).resolves.toBe(true);

    await expect(
      repository.findById(saved.id),
    ).resolves.toBeNull();
  });

  it('does not delete an active configuration when called directly', async () => {
    const saved = await create('Kitchen A');

    await repository.activate(saved.id);

    await expect(
      repository.delete(saved.id),
    ).resolves.toBe(false);

    await expect(
      repository.findById(saved.id),
    ).resolves.toMatchObject({
      is_active: true,
    });
  });

  it('activates one configuration and deactivates the previous one', async () => {
    const first = await create('Kitchen A');
    const second = await create('Kitchen B');

    await repository.activate(first.id);

    const activated = await repository.activate(second.id);

    expect(activated).toMatchObject({
      id: second.id,
      is_active: true,
    });

    expect(
      await repository.findById(first.id),
    ).toMatchObject({
      is_active: false,
    });

    expect(
      await repository.findActive(),
    ).toMatchObject({
      id: second.id,
      is_active: true,
    });

    expect(
      await source
        .getRepository(KitchenConfigurationEntity)
        .countBy({ is_active: true }),
    ).toBe(1);
  });

  it('returns null for an unknown activation ID without changing the active configuration', async () => {
    const active = await create('Kitchen A');

    await repository.activate(active.id);

    await expect(
      repository.activate(randomUUID()),
    ).resolves.toBeNull();

    await expect(
      repository.findActive(),
    ).resolves.toMatchObject({
      id: active.id,
      is_active: true,
    });
  });

  it('enforces unique configuration names in PostgreSQL', async () => {
    await create('Kitchen A');

    await expect(
      create('Kitchen A'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces at most one active configuration at database level', async () => {
    const first = await create('Kitchen A');
    const second = await create('Kitchen B');

    await repository.activate(first.id);

    await expect(
      source
        .getRepository(KitchenConfigurationEntity)
        .update(
          { id: second.id },
          { is_active: true },
        ),
    ).rejects.toMatchObject({
      driverError: {
        code: '23505',
      },
    });

    expect(
      await source
        .getRepository(KitchenConfigurationEntity)
        .countBy({ is_active: true }),
    ).toBe(1);
  });
});