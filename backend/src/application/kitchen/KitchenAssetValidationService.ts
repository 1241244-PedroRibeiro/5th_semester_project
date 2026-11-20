
import {
    Injectable,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class KitchenAssetValidationService {
    private readonly assetBaseUrl =
        process.env.KITCHEN_ASSET_BASE_URL ?? 'http://frontend';

    private readonly allowedPath =
        /^\/assets\/3d\/models\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.glb$/;

    async validate(configuration: unknown): Promise<void> {
        if (
            configuration === null ||
            typeof configuration !== 'object' ||
            Array.isArray(configuration)
        ) {
            return;
        }

        const equipment = (
            configuration as Record<string, unknown>
        ).equipment;

        if (!Array.isArray(equipment)) {
            return;
        }

        const references = new Set<string>();
        const errors: string[] = [];

        for (let index = 0; index < equipment.length; index++) {
            const item = equipment[index] as Record<string, unknown>;
            const modelUrl = item?.modelUrl;

            if (typeof modelUrl !== 'string') {
                continue;
            }

            if (!this.allowedPath.test(modelUrl)) {
                errors.push(
                    `/equipment/${index}/modelUrl: invalid or unsafe model path.`
                );
                continue;
            }

            references.add(modelUrl);
        }

        if (errors.length > 0) {
            throw new UnprocessableEntityException({
                message: 'Invalid kitchen model references.',
                errors,
            });
        }

        const results = await Promise.all(
            [...references].map(async (modelUrl) => {
                try {
                    const response = await fetch(
                        new URL(modelUrl, this.assetBaseUrl),
                        {
                            method: 'HEAD',
                            signal: AbortSignal.timeout(5000),
                        },
                    );

                    return {
                        modelUrl,
                        exists: response.ok,
                    };
                } catch {
                    throw new ServiceUnavailableException(
                        'The kitchen asset server is currently unavailable.'
                    );
                }
            }),
        );

        const missing = results
            .filter(result => !result.exists)
            .map(result => result.modelUrl);

        if (missing.length > 0) {
            throw new UnprocessableEntityException({
                message: 'Some kitchen models do not exist.',
                missingAssets: missing,
            });
        }
    }
}
