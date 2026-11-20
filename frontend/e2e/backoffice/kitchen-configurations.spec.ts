import { expect, test, type Page } from '@playwright/test';
import Ajv2020 from 'ajv/dist/2020';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const token = `e30.${Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
).toString('base64url')}.test`;


const kitchenA = {
    id: 'kitchen-1',
    name: 'Standard Kitchen',
    isActive: true,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    jsonContent: {
        schemaVersion: '1.0',
        metadata: {
            name: 'Standard Kitchen',
            description: 'Standard preparation layout'
        },
        dimensions: {
            x: 10,
            y: 3.5,
            z: 8
        },
        equipment: [
            {
                id: 'main-counter',
                label: 'Main Preparation Counter',
                category: 'counter',
                modelUrl: '/assets/3d/models/counter.glb',
                position: [3.5, 0, 2],
                rotation: [0, 0, 0],
                scale: [1, 1, 1]
            },
            {
                id: 'wood-fired-oven',
                label: 'Wood-fired Oven',
                category: 'oven',
                modelUrl: '/assets/3d/models/WoodFiredOven.glb',
                position: [8.5, 0, 4],
                rotation: [0, -1.5708, 0],
                scale: [1, 1, 1]
            }
        ],
        lights: [
            {
                type: 'ambient',
                color: '#ffffff',
                intensity: 0.5
            },
            {
                type: 'spot',
                color: '#ffe0b0',
                intensity: 2,
                position: [4, 3.4, 3.5],
                target: [4, 0.8, 2],
                angle: 0.75,
                penumbra: 0.55,
                decay: 1.5,
                distance: 12
            }
        ],
        animationTriggers: []
    }
};

const kitchenB = {
    id: 'kitchen-2',
    name: 'Modern Kitchen',
    isActive: false,
    createdAt: '2026-11-02T10:00:00Z',
    updatedAt: '2026-11-02T10:00:00Z',
    jsonContent: {
        schemaVersion: '1.0',
        metadata: {
            name: 'Modern Kitchen',
            description: 'Alternative assembly-line layout'
        },
        dimensions: {
            x: 12,
            y: 4,
            z: 10
        },
        equipment: [
            {
                id: 'receiving-platform',
                label: 'Receiving Platform',
                category: 'receiving_platform',
                modelUrl: '/assets/3d/models/ReceivingPlatform.glb',
                position: [1, 0.9, 2],
                rotation: [0, 0, 0],
                scale: [1.1, 1.1, 1.1]
            },
            {
                id: 'main-conveyor',
                label: 'Main Conveyor Belt',
                category: 'conveyor',
                modelUrl: '/assets/3d/models/MainConveyor.glb',
                position: [4, 1.1, 2],
                rotation: [0, 0, 0],
                scale: [1, 1, 1]
            },
            {
                id: 'assembly-arm',
                label: 'Assembly Robot Arm',
                category: 'robot_arm',
                modelUrl: '/assets/3d/models/RobotArm_01.glb',
                position: [5.5, 1.8, 2],
                rotation: [0, 0, 0],
                scale: [1, 1, 1]
            },
            {
                id: 'cheese-dispenser',
                label: 'Cheese Dispenser',
                category: 'dispenser',
                modelUrl: '/assets/3d/models/CheeseDispenser.glb',
                position: [5.5, 2.5, 2],
                rotation: [0, 0, 0],
                scale: [1, 1, 1]
            }
        ],
        lights: [
            {
                type: 'ambient',
                color: '#ffffff',
                intensity: 0.4
            },
            {
                type: 'directional',
                color: '#ffffff',
                intensity: 2.5,
                position: [6, 9, 8],
                target: [6, 0, 5],
                castShadow: true
            }
        ],
        animationTriggers: [
            {
                id: 'conveyor-loop',
                name: 'Conveyor Loop',
                targetEquipmentId: 'main-conveyor',
                action: 'loop',
                loop: true,
                delay: 0
            },
            {
                id: 'arm-loop',
                name: 'Assembly Arm Loop',
                targetEquipmentId: 'assembly-arm',
                action: 'loop',
                loop: true,
                delay: 0.5
            }
        ]
    }
};

async function seedManagerSession(page: Page) {
    await page.addInitScript((sessionToken) => {
        sessionStorage.setItem(
            'forno-session',
            JSON.stringify({
                token: sessionToken,
                user: {
                    username: 'test_manager',
                    firstName: 'Test',
                    lastName: 'Manager',
                    email: 'manager@test.local',
                    roles: ['MANAGER'],
                    status: 'ACTIVE'
                }
            })
        );
    }, token);
}

async function mockKitchenApi(page: Page) {
    // A fresh copy is created for every test, so changes do not leak between tests.
    let configurations = [
        structuredClone(kitchenA),
        structuredClone(kitchenB)
    ];


    // Use one API handler to avoid overlapping Playwright route handlers.
    await page.route('**/api/kitchen-configurations**', async route => {
        const request = route.request();
        const method = request.method();
        const pathname = new URL(request.url()).pathname;

        if (pathname.endsWith('/active') && method === 'GET') {
            const active = configurations.find(item => item.isActive);

            if (!active) {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'No active configuration' })
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(active)
            });
            return;
        }

        const activationMatch = pathname.match(
            /\/api\/kitchen-configurations\/([^/]+)\/activate$/
        );

        if (activationMatch && method === 'POST') {
            const id = activationMatch[1];
            const exists = configurations.some(item => item.id === id);

            if (!exists) {
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Configuration not found' })
                });
                return;
            }

            configurations = configurations.map(item => ({
                ...item,
                isActive: item.id === id
            }));

            const activated = configurations.find(item => item.id === id)!;

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(activated)
            });
            return;
        }

        if (pathname === '/api/kitchen-configurations' && method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(configurations)
            });
            return;
        }

        if (pathname === '/api/kitchen-configurations' && method === 'POST') {
            const body = request.postDataJSON();
            const now = new Date().toISOString();
            const created = {
                id: 'kitchen-3',
                name: body.name,
                jsonContent: body.jsonContent,
                isActive: false,
                createdAt: now,
                updatedAt: now
            };

            configurations.push(created);

            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(created)
            });
            return;
        }

        const itemMatch = pathname.match(
            /\/api\/kitchen-configurations\/([^/]+)$/
        );

        if (itemMatch) {
            const id = itemMatch[1];
            const item = configurations.find(configuration => configuration.id === id);

            if (method === 'GET') {
                if (!item) {
                    await route.fulfill({ status: 404, body: '' });
                    return;
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(item)
                });
                return;
            }

            if (method === 'PUT') {
                if (!item) {
                    await route.fulfill({ status: 404, body: '' });
                    return;
                }

                const body = request.postDataJSON();
                Object.assign(item, body, { updatedAt: new Date().toISOString() });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(item)
                });
                return;
            }

            if (method === 'DELETE') {
                if (!item) {
                    await route.fulfill({ status: 404, body: '' });
                    return;
                }

                if (item.isActive) {
                    await route.fulfill({
                        status: 409,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            message: 'Active configuration cannot be deleted'
                        })
                    });
                    return;
                }

                configurations = configurations.filter(configuration => configuration.id !== id);
                await route.fulfill({ status: 204, body: '' });
                return;
            }
        }

        // Let unrelated methods/paths continue to the normal application server.
        await route.continue();
    });
}

test.describe('WEB06 - Kitchen Configurations', () => {
    test.beforeEach(async ({ page }) => {
        await seedManagerSession(page);
        await mockKitchenApi(page);
        await page.goto('/backoffice/kitchen-configurations');
    });

    test('accepts both demo kitchens with the official schema and existing GLB assets', async () => {
        const schema = JSON.parse(
            readFileSync(
                resolve(process.cwd(), 'public/schemas/kitchen-schema.json'),
                'utf-8'
            )
        );

        const ajv = new Ajv2020({
            allErrors: true,
            strict: false
        });

        const validate = ajv.compile(schema);

        for (const kitchen of [kitchenA, kitchenB]) {
            const isValid = validate(kitchen.jsonContent);

            expect(
                isValid,
                `${kitchen.name}: ${JSON.stringify(validate.errors)}`
            ).toBe(true);

            for (const equipment of kitchen.jsonContent.equipment) {
                const assetPath = resolve(
                    process.cwd(),
                    'public',
                    equipment.modelUrl.replace(/^\/+/, '')
                );

                expect(
                    existsSync(assetPath),
                    `Missing GLB asset: ${equipment.modelUrl}`
                ).toBe(true);
            }
        }
    });

    test('rejects a structurally invalid kitchen layout using the official schema', async () => {
        const schema = JSON.parse(
            readFileSync(
                resolve(process.cwd(), 'public/schemas/kitchen-schema.json'),
                'utf-8'
            )
        );

        const ajv = new Ajv2020({
            allErrors: true,
            strict: false
        });

        const validate = ajv.compile(schema);

        const invalidKitchen = structuredClone(kitchenA.jsonContent);

        invalidKitchen.equipment = [];

        expect(validate(invalidKitchen)).toBe(false);
    });

    test('Manager can access Kitchen Configurations', async ({ page }) => {
        await expect(
            page.getByRole('heading', {
                name: 'Kitchen Configurations',
                exact: true
            })
        ).toBeVisible();

        await expect(page.getByText('Kitchen layouts')).toBeVisible();
    });

    test('displays the existing configurations', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: 'Standard Kitchen' })
        ).toBeVisible();

        await expect(
            page.getByRole('heading', { name: 'Modern Kitchen' })
        ).toBeVisible();

        await expect(page.locator('.configuration-card')).toHaveCount(2);
    });

    test('searches configurations by name', async ({ page }) => {
        const search = page.getByPlaceholder('Search configurations...');
        await search.fill('Modern');

        await expect(page.locator('.configuration-card')).toHaveCount(1);
        await expect(
            page.getByRole('heading', { name: 'Modern Kitchen' })
        ).toBeVisible();

        await expect(
            page.getByRole('heading', { name: 'Standard Kitchen' })
        ).toHaveCount(0);
    });

    test('opens the creation form', async ({ page }) => {
        await page.getByRole('button', {
            name: /Create configuration/
        }).click();

        await expect(
            page.getByRole('heading', {
                name: 'Create kitchen configuration'
            })
        ).toBeVisible();

        await expect(page.locator('textarea[name="jsonContent"]')).toBeVisible();
    });

    test('rejects invalid JSON syntax', async ({ page }) => {
        await page.getByRole('button', {
            name: /Create configuration/
        }).click();

        await page.locator('input[name="name"]').fill('Invalid Configuration');
        await page.locator('textarea[name="jsonContent"]').fill('{ invalid json }');

        await page.getByRole('button', {
            name: 'Save configuration'
        }).click();

        await expect(
            page.locator('p.notice.error[role="alert"]')
        ).toContainText('Invalid JSON syntax');
    });

    test('opens an existing configuration for editing', async ({ page }) => {
        const card = page.locator('.configuration-card').filter({
            hasText: 'Standard Kitchen'
        });

        await card.getByRole('button', { name: 'Edit' }).click();

        await expect(
            page.getByRole('heading', {
                name: 'Edit kitchen configuration'
            })
        ).toBeVisible();

        await expect(page.locator('input[name="name"]')).toHaveValue('Standard Kitchen');
    });

    test('activates another kitchen configuration', async ({ page }) => {
        const card = page.locator('.configuration-card').filter({
            hasText: 'Modern Kitchen'
        });

        await card.getByRole('button', { name: 'Activate' }).click();

        await expect(
            page.getByRole('heading', {
                name: 'Activate kitchen configuration?'
            })
        ).toBeVisible();

        await page.getByRole('button', { name: 'Confirm' }).click();

        await expect(
            card.getByText('Active', { exact: true })
        ).toBeVisible();

        await expect(
            page.locator('.configuration-card')
                .filter({ hasText: 'Standard Kitchen' })
                .getByText('Inactive', { exact: true })
        ).toBeVisible();
    });

    test('does not allow deleting the active configuration', async ({ page }) => {
        const activeCard = page.locator('.configuration-card').filter({
            hasText: 'Standard Kitchen'
        });

        const deleteButton = activeCard.getByRole('button', { name: 'Delete' });
        await expect(deleteButton).toBeDisabled();
    });

    
});
