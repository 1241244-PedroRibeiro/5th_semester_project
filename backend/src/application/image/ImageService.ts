import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Sku } from '../../domain/product/Sku';
import { ProductName } from '../../domain/product/ProductName';
import { IProductRepository, PRODUCT_REPOSITORY } from '../product/IProductRepository';
import {
	IPredefinedPizzaRepository,
	PREDEFINED_PIZZA_REPOSITORY,
} from '../pizza/IPredefinedPizzaRepository';
import { IImageStorage, IMAGE_STORAGE } from './IImageStorage';
import { ImageContentDTO, ImageUploadResponseDTO, UploadedImageFile } from './ImageDTOs';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
};
const MIME_BY_EXTENSION: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
};

/**
 * Stores and retrieves item pictures (products and predefined pizzas).
 * Pictures live in the pictures directory (a Docker volume mounted at data/pictures)
 * and are named after the item's SKU, e.g. `PIZ-MARGHERITA.jpg`.
 */
@Injectable()
export class ImageService {
	constructor(
		@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
		@Inject(PREDEFINED_PIZZA_REPOSITORY) private readonly pizzaRepo: IPredefinedPizzaRepository,
		@Inject(IMAGE_STORAGE) private readonly storage: IImageStorage,
	) {}

	/** Returns the item's picture, or a default placeholder when none exists. */
	async getImage(identifier: string): Promise<ImageContentDTO> {
		const label = this.requireIdentifier(identifier);

		const sku = await this.resolveSku(label);
		const stored = sku ? await this.storage.find(sku) : null;
		if (!stored)
			return this.placeholder(label);

		return {
			content: stored.content,
			contentType: MIME_BY_EXTENSION[stored.extension],
			isPlaceholder: false,
		};
	}

	/** Saves (or replaces) the picture of the product or pizza identified by name or SKU. */
	async saveImage( identifier: string,  file: UploadedImageFile | undefined,): Promise<ImageUploadResponseDTO> {
		const label = this.requireIdentifier(identifier);
		if (!file || !file.buffer?.length)
			throw new BadRequestException('An image file is required');
		if (file.size > MAX_IMAGE_SIZE)
			throw new BadRequestException('Image is too large (max 5 MB)');

		const extension = EXTENSION_BY_MIME[file.mimetype];
		if (!extension)
			throw new BadRequestException('Unsupported image type. Use JPEG, PNG, WEBP or GIF');
		if (this.detectMime(file.buffer) !== file.mimetype)
			throw new BadRequestException('Image content does not match its declared type');

		const sku = await this.resolveSku(label);
		if (!sku)
			throw new NotFoundException('Item not found');

		const fileName = await this.storage.save(sku, extension, file.buffer);

		return { sku, fileName, contentType: file.mimetype, size: file.buffer.length };
	}

	private requireIdentifier(identifier: string): string {
		const label = (identifier ?? '').trim();
		if (!label)
			throw new BadRequestException('Item name or SKU is required');
		return label;
	}

	/** Resolves a product SKU, product name or pizza recipe name to the item's SKU. */
	private async resolveSku(identifier: string): Promise<string | null> {
		const bySku = await this.productRepo.findBySku(Sku.create(identifier));
		if (bySku)
			return bySku.sku.value;

		const byName = await this.productRepo.findByName(ProductName.create(identifier));
		if (byName)
			return byName.sku.value;

		const wanted = identifier.toLowerCase();
		const pizzas = await this.pizzaRepo.findAll();
		const pizza = pizzas.find(
			(p) => p.recipeName.toLowerCase() === wanted || p.id.pizzaSku.value.toLowerCase() === wanted,
		);
		return pizza ? pizza.id.pizzaSku.value : null;
	}

	private detectMime(buffer: Buffer): string | null {
		if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
			return 'image/jpeg';
		}
		if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
			return 'image/png';
		}
		if (
			buffer.length >= 12 &&
			buffer.toString('ascii', 0, 4) === 'RIFF' &&
			buffer.toString('ascii', 8, 12) === 'WEBP'
		) {
			return 'image/webp';
		}
		if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) {
			return 'image/gif';
		}
		return null;
	}

	/** Default picture shown when an item has no stored image. */
	private placeholder(label: string): ImageContentDTO {
		const escape = (text: string) =>
			text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;');
		const name = escape(label.length > 40 ? `${label.slice(0, 39)}…` : label);
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="No image available for ${name}">
	<rect width="1024" height="1024" fill="#f3efe8"/>
	<g fill="none" stroke="#b8ab98" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
		<rect x="352" y="300" width="320" height="240" rx="28"/>
		<circle cx="440" cy="384" r="30"/>
		<path d="M372 512l96-96 72 72 48-48 64 64"/>
		<path d="M332 280l360 280"/>
	</g>
	<text x="512" y="640" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="44" font-weight="600" fill="#6b5f50">No image available</text>
	<text x="512" y="700" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="32" fill="#8a7d6d">There is no picture related to this item</text>
	<text x="512" y="756" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" fill="#a09380">${name}</text>
</svg>`;
		return { content: Buffer.from(svg, 'utf8'), contentType: 'image/svg+xml', isPlaceholder: true };
	}
}
