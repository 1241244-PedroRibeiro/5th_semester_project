
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { KitchenConfigurationService } from '../../../../src/application/kitchen/KitchenConfigurationService';

import {
  IKitchenConfigurationRepository,
  KitchenConfigurationRecord,
} from '../../../../src/application/kitchen/IKitchenConfigurationRepository';

import { KitchenConfigValidationService } from '../../../../src/application/kitchen/KitchenConfigValidationService';
import { KitchenAssetValidationService } from '../../../../src/application/kitchen/KitchenAssetValidationService';

describe('KitchenConfigurationService', () => {
  let service: KitchenConfigurationService;

  let repository: jest.Mocked<IKitchenConfigurationRepository>;
  let validator: jest.Mocked<KitchenConfigValidationService>;
  let assetValidator: jest.Mocked<KitchenAssetValidationService>;

  const validJson = {
    schemaVersion: '1.0',
    dimensions: { width: 10 },
    equipment: [],
  };

  const record = (
    overrides: Partial<KitchenConfigurationRecord> = {},
  ): KitchenConfigurationRecord => ({
    id: '7a3e8f3a-2b3c-4d5e-8f90-123456789abc',
    name: 'Kitchen A',
    json_content: validJson,
    is_active: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      activate: jest.fn(),
    };

    validator = {
      validate: jest.fn(),
    } as unknown as jest.Mocked<KitchenConfigValidationService>;

    assetValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<KitchenAssetValidationService>;

    service = new KitchenConfigurationService(
      repository,
      validator,
      assetValidator,
    );
  });

  describe('getAll', () => {
    it('returns all configurations', async () => {
      const rows = [
        record(),
        record({ id: 'other', name: 'Kitchen B' }),
      ];

      repository.findAll.mockResolvedValue(rows);

      await expect(service.getAll()).resolves.toBe(rows);
    });
  });

  describe('getById', () => {
    it('returns the requested configuration', async () => {
      const row = record();

      repository.findById.mockResolvedValue(row);

      await expect(service.getById(row.id)).resolves.toBe(row);
    });

    it('throws NotFoundException when the ID does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.getById('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it.each([
      '',
      '   ',
      ' Kitchen',
      'Kitchen ',
      'x'.repeat(101),
    ])('rejects invalid name %p', async (name) => {
      await expect(
        service.create(name, validJson),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a valid configuration', async () => {
      const created = record();

      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(created);

      await expect(
        service.create('Kitchen A', validJson),
      ).resolves.toBe(created);

      expect(validator.validate).toHaveBeenCalledWith(validJson);
      expect(assetValidator.validate).toHaveBeenCalledWith(validJson);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Kitchen A',
        json_content: validJson,
      });
    });

    it('rejects duplicate names', async () => {
      repository.findByName.mockResolvedValue(record());

      await expect(
        service.create('Kitchen A', validJson),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not persist when JSON validation fails', async () => {
      validator.validate.mockImplementation(() => {
        throw new Error('invalid JSON schema');
      });

      await expect(
        service.create('Kitchen A', validJson),
      ).rejects.toThrow('invalid JSON schema');

      expect(assetValidator.validate).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not persist when asset validation fails', async () => {
      assetValidator.validate.mockRejectedValue(
        new Error('missing model'),
      );

      await expect(
        service.create('Kitchen A', validJson),
      ).rejects.toThrow('missing model');

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing configuration', async () => {
      const current = record();
      const updated = record({ name: 'Kitchen Updated' });

      repository.findById.mockResolvedValue(current);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(updated);

      await expect(
        service.update(current.id, updated.name, validJson),
      ).resolves.toBe(updated);

      expect(repository.update).toHaveBeenCalledWith({
        id: current.id,
        name: updated.name,
        json_content: validJson,
      });
    });

    it('rejects an unknown ID', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', 'Kitchen A', validJson),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a name owned by another configuration', async () => {
      repository.findById.mockResolvedValue(record());

      repository.findByName.mockResolvedValue(
        record({ id: 'another-id' }),
      );

      await expect(
        service.update(
          '7a3e8f3a-2b3c-4d5e-8f90-123456789abc',
          'Taken',
          validJson,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not update if validation fails', async () => {
      validator.validate.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.update('id', 'Kitchen A', validJson),
      ).rejects.toThrow('invalid');

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws if the row disappears before update', async () => {
      repository.findById.mockResolvedValue(record());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(null);

      await expect(
        service.update('id', 'Kitchen A', validJson),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes an inactive configuration', async () => {
      repository.findById.mockResolvedValue(record());
      repository.delete.mockResolvedValue(true);

      await expect(
        service.delete('id'),
      ).resolves.toBeUndefined();

      expect(repository.delete).toHaveBeenCalledWith('id');
    });

    it('rejects deletion of the active configuration', async () => {
      repository.findById.mockResolvedValue(
        record({ is_active: true }),
      );

      await expect(
        service.delete('id'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown ID', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.delete('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException if the repository cannot delete', async () => {
      repository.findById.mockResolvedValue(record());
      repository.delete.mockResolvedValue(false);

      await expect(
        service.delete('id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('activate', () => {
    it('validates and activates an existing configuration', async () => {
      const activated = record({ is_active: true });

      repository.findById.mockResolvedValue(record());
      repository.activate.mockResolvedValue(activated);

      await expect(
        service.activate(activated.id),
      ).resolves.toBe(activated);

      expect(validator.validate).toHaveBeenCalledWith(validJson);
      expect(assetValidator.validate).toHaveBeenCalledWith(validJson);
      expect(repository.activate).toHaveBeenCalledWith(activated.id);
    });

    it('rejects an unknown ID', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.activate('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.activate).not.toHaveBeenCalled();
    });

    it('does not activate a configuration with invalid JSON', async () => {
      repository.findById.mockResolvedValue(record());

      validator.validate.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.activate('id'),
      ).rejects.toThrow('invalid');

      expect(repository.activate).not.toHaveBeenCalled();
    });

    it('does not activate a configuration with invalid assets', async () => {
      repository.findById.mockResolvedValue(record());

      assetValidator.validate.mockRejectedValue(
        new Error('asset unavailable'),
      );

      await expect(
        service.activate('id'),
      ).rejects.toThrow('asset unavailable');

      expect(repository.activate).not.toHaveBeenCalled();
    });
  });

  describe('getActive', () => {
    it('returns the active configuration after validating it', async () => {
      const active = record({ is_active: true });

      repository.findActive.mockResolvedValue(active);

      await expect(
        service.getActive(),
      ).resolves.toBe(active);

      expect(validator.validate).toHaveBeenCalledWith(validJson);
      expect(assetValidator.validate).toHaveBeenCalledWith(validJson);
    });

    it('throws NotFoundException when no configuration is active', async () => {
      repository.findActive.mockResolvedValue(null);

      await expect(
        service.getActive(),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
