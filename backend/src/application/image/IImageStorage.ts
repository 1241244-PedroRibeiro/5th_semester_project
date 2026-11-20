export const IMAGE_STORAGE = 'IImageStorage';

export interface StoredImage {
	content: Buffer;
	/** Lower-case file extension without the dot, e.g. `jpg`. */
	extension: string;
}

/** Outbound port for item pictures, which are keyed by the item's SKU. */
export interface IImageStorage {
	find(sku: string): Promise<StoredImage | null>;
	/** Stores the picture, replacing any previous one for the SKU. Returns the stored file name. */
	save(sku: string, extension: string, content: Buffer): Promise<string>;
}
