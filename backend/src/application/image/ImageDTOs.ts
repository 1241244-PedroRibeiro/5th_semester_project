export interface UploadedImageFile {
	buffer: Buffer;
	mimetype: string;
	size: number;
	originalname?: string;
}

export interface ImageContentDTO {
	content: Buffer;
	contentType: string;
	/** True when the item has no stored picture and the default placeholder is returned. */
	isPlaceholder: boolean;
}

export interface ImageUploadResponseDTO {
	sku: string;
	fileName: string;
	contentType: string;
	size: number;
}
