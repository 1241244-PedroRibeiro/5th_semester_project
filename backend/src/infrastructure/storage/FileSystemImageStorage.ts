import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { IImageStorage, StoredImage } from '../../application/image/IImageStorage';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/** Pictures directory: the Docker volume mounted at data/pictures (overridable with PICTURES_DIR). */
export function picturesDirectory(): string {
	return resolve(process.env.PICTURES_DIR || join(process.cwd(), 'data', 'pictures'));
}

/** Stores item pictures as `<SKU>.<ext>` files inside the pictures directory. */
export class FileSystemImageStorage implements IImageStorage {
	constructor(private readonly directory: string) {}

	async find(sku: string): Promise<StoredImage | null> {
		const fileName = this.storedFiles(sku)[0];
		if (!fileName)
			return null;
		return {
			content: readFileSync(join(this.directory, fileName)),
			extension: fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase(),
		};
	}

	async save(sku: string, extension: string, content: Buffer): Promise<string> {
		if (!this.isSafeFileStem(sku) || !IMAGE_EXTENSIONS.has(extension))
			throw new Error(`Refusing to store picture '${sku}.${extension}'`);
		mkdirSync(this.directory, { recursive: true });
		for (const name of this.storedFiles(sku))
			unlinkSync(join(this.directory, name));
		const fileName = `${sku}.${extension}`;
		writeFileSync(join(this.directory, fileName), content);
		return fileName;
	}

	private storedFiles(sku: string): string[] {
		if (!this.isSafeFileStem(sku) || !existsSync(this.directory))
			return [];
		return readdirSync(this.directory).filter((name) => {
			const dot = name.lastIndexOf('.');
			return dot > 0 && name.slice(0, dot) === sku && IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
		});
	}

	/** SKUs become file names, so reject anything that could escape the pictures directory. */
	private isSafeFileStem(value: string): boolean {
		return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
	}
}
