import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImageService } from '../../../src/application/image/ImageService';
import { FileSystemImageStorage } from '../../../src/infrastructure/storage/FileSystemImageStorage';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

const product = (sku: string, name: string) => ({ sku: { value: sku }, name: { value: name } });

describe('ImageService', () => {
	let dir: string;
	let service: ImageService;
	const productRepo = {
		findBySku: jest.fn(),
		findByName: jest.fn(),
	};
	const pizzaRepo = { findAll: jest.fn() };

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'pictures-'));
		productRepo.findBySku.mockImplementation(async (sku: { value: string }) =>
			sku.value === 'PIZ-MARGHERITA' ? product('PIZ-MARGHERITA', 'Margherita') : null,
		);
		productRepo.findByName.mockImplementation(async (name: { value: string }) =>
			name.value.toLowerCase() === 'margherita' ? product('PIZ-MARGHERITA', 'Margherita') : null,
		);
		pizzaRepo.findAll.mockResolvedValue([
			{ recipeName: 'Classic Margherita', id: { pizzaSku: { value: 'PIZ-MARGHERITA' } } },
		]);
		service = new ImageService(productRepo as never, pizzaRepo as never, new FileSystemImageStorage(dir));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('retrieves a stored picture by SKU, product name or pizza recipe name', async () => {
		writeFileSync(join(dir, 'PIZ-MARGHERITA.jpg'), JPEG);
		for (const identifier of ['PIZ-MARGHERITA', 'Margherita', 'classic margherita']) {
			const image = await service.getImage(identifier);
			expect(image.isPlaceholder).toBe(false);
			expect(image.contentType).toBe('image/jpeg');
			expect(image.content.equals(JPEG)).toBe(true);
		}
	});

	it('returns a default placeholder saying there is no image when the item has no picture', async () => {
		const image = await service.getImage('Unknown Pizza');
		expect(image.isPlaceholder).toBe(true);
		expect(image.contentType).toBe('image/svg+xml');
		expect(image.content.toString()).toContain('No image available');
		expect(image.content.toString()).toContain('Unknown Pizza');
	});

	it('escapes the item label inside the placeholder', async () => {
		const svg = (await service.getImage('<script>x</script>')).content.toString();
		expect(svg).not.toContain('<script>');
	});

	it('uploads a picture named after the SKU and replaces previous ones', async () => {
		writeFileSync(join(dir, 'PIZ-MARGHERITA.jpg'), JPEG);
		const result = await service.saveImage('Margherita', {
			buffer: PNG,
			mimetype: 'image/png',
			size: PNG.length,
		});
		expect(result.fileName).toBe('PIZ-MARGHERITA.png');
		expect(readdirSync(dir)).toEqual(['PIZ-MARGHERITA.png']);
	});

	it('throws for unknown items, missing files, mismatched content and empty identifiers', async () => {
		await expect(
			service.saveImage('Nope', { buffer: JPEG, mimetype: 'image/jpeg', size: 6 }),
		).rejects.toBeInstanceOf(NotFoundException);
		await expect(service.saveImage('PIZ-MARGHERITA', undefined)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		await expect(
			service.saveImage('PIZ-MARGHERITA', { buffer: JPEG, mimetype: 'image/png', size: 6 }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service.saveImage('PIZ-MARGHERITA', { buffer: JPEG, mimetype: 'text/html', size: 6 }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.getImage('   ')).rejects.toBeInstanceOf(BadRequestException);
	});
});
