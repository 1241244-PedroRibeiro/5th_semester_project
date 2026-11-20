
import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,  
    ViewChild,
} from '@angular/core';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface KitchenDimensions {
    x: number;
    y: number;
    z: number;
}

interface KitchenEquipment {
    id: string;
    label?: string;
    category?: string;
    modelUrl: string;
    position: number[];
    rotation: number[];
    scale: number[];
}


interface KitchenLight {
    type: 'ambient' | 'hemisphere' | 'directional' | 'point' | 'spot';
    color?: string;
    intensity: number;
    position?: number[];
    skyColor?: string;
    groundColor?: string;
    distance?: number;
    decay?: number;
    angle?: number;
    penumbra?: number;
    target?: number[];
    castShadow?: boolean;
}


export interface KitchenLayout {
    schemaVersion: string;
    dimensions: KitchenDimensions;
    equipment: KitchenEquipment[];
    lights: KitchenLight[];
}

@Component({
    selector: 'app-kitchen-viewer',
    standalone: true,
    template: `
        <div class="viewer-wrapper">
            <div #container class="viewer-container"></div>
            <div #guiContainer class="light-gui-container"></div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            width: 100%;
        }

        .viewer-container {
            width: 100%;
            height: clamp(400px, 65vh, 750px);
            overflow: hidden;
            border-radius: 12px;
            background: #202832;
        }

        .viewer-container canvas {
            display: block;
        }

        .viewer-wrapper {
            position: relative;
            width: 100%;
        }

        .light-gui-container {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            max-height: calc(100% - 24px);
            overflow-y: auto;
        }

        .light-gui-container .lil-gui {
            --width: 280px;
            --background-color: #202832;
            --text-color: #ffffff;
            --title-background-color: #344454;
            --widget-color: #52677a;
            --hover-color: #40566b;
            --focus-color: #607d99;
            --number-color: #ffffff;
            --string-color: #ffffff;
        }
    `],
})
export class KitchenViewer implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('container', { static: true })
    private container!: ElementRef<HTMLDivElement>;

private initialized = false;
private modelLoadVersion = 0;

    @Input({ required: true })
    configuration!: KitchenLayout;

    @ViewChild('guiContainer', { static: true })
    private guiContainer!: ElementRef<HTMLDivElement>;

    private lightGui?: GUI;

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private animationFrame = 0;
    private resizeObserver?: ResizeObserver;
    private readonly gltfLoader = new GLTFLoader();


ngAfterViewInit(): void {
    this.initializeScene();

    this.initialized = true;

    this.rebuildKitchen();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container.nativeElement);

    this.animate();
}

ngOnChanges(changes: SimpleChanges): void {
    if (
        changes['configuration'] &&
        this.initialized
    ) {
        this.rebuildKitchen();
    }
}

private rebuildKitchen(): void {
    if (!this.scene || !this.configuration) {
        return;
    }

    // Invalida carregamentos GLB iniciados pela configuração anterior.
    this.modelLoadVersion++;

    // Remove e liberta a GUI anterior.
    this.lightGui?.destroy();
    this.lightGui = undefined;
    this.guiContainer.nativeElement.innerHTML = '';

    // Remove todos os objetos da configuração anterior.
    this.disposeSceneObjects();

    // Atualiza a posição e os limites da câmara.
    this.updateCameraForConfiguration();

    // Constrói a nova cozinha.
    this.createKitchen();
    this.createLights();
    this.createEquipment();

    this.controls.update();
    this.resize();
}

private disposeSceneObjects(): void {
    const objects = [...this.scene.children];

    for (const object of objects) {
        this.scene.remove(object);

        object.traverse(child => {
            const mesh = child as THREE.Mesh;

            if (mesh.geometry) {
                mesh.geometry.dispose();
            }

            if (mesh.material) {
                const materials = Array.isArray(mesh.material)
                    ? mesh.material
                    : [mesh.material];

                materials.forEach(material => material.dispose());
            }

            const light = child as THREE.Light & {
                shadow?: THREE.LightShadow;
            };

            if (light.isLight && light.shadow) {
                light.shadow.map?.dispose();
            }
        });
    }
}

private updateCameraForConfiguration(): void {
    const { x, y, z } = this.configuration.dimensions;

    const center = new THREE.Vector3(
        x / 2,
        0,
        z / 2
    );

    const maxDimension = Math.max(x, y, z);
    const distance = maxDimension * 1.2;

    this.camera.position.set(
        center.x + distance * 0.85,
        distance * 0.75,
        center.z + distance * 0.85
    );

    this.camera.near = 0.1;
    this.camera.far = Math.max(1000, maxDimension * 10);
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);

    this.controls.minDistance = maxDimension * 0.35;
    this.controls.maxDistance = maxDimension * 3;

    this.controls.maxTargetRadius = maxDimension * 1.5;
}



    private initializeScene(): void {
        const element = this.container.nativeElement;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x202832);

        const { x, y, z } = this.configuration.dimensions;

        this.camera = new THREE.PerspectiveCamera(
            45,
            element.clientWidth / element.clientHeight,
            0.1,
            1000,
        );

        // Centro do chão da cozinha.
        const center = new THREE.Vector3(
            x / 2,
            0,
            z / 2,
        );

        // Distância calculada para enquadrar toda a cozinha.
        const maxDimension = Math.max(x, y, z);
        const distance = maxDimension * 1.2;

        // Vista em perspetiva a partir da frente e de cima.
        this.camera.position.set(
            center.x + distance * 0.85,
            center.y + distance * 0.75,
            center.z + distance * 0.85,
        );


        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2),
        );

        // Ativar sombras suaves.
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Gestão de cor e exposição.
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Tone mapping para evitar zonas sobre-expostas.
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;


        element.appendChild(this.renderer.domElement);


                
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );

        // VIS07 - Perspective Camera Interaction

        // Movimentos suaves da câmara.
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Configuração dos movimentos do rato.
        this.controls.enablePan = true;
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;

        // Botão esquerdo: PAN.
        // Botão direito: ORBIT / ROTATE.
        // Scroll: DOLLY / ZOOM.
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
        };

        // Velocidade dos movimentos.
        this.controls.panSpeed = 0.7;
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 0.8;

        // Ponto inicial: centro do chão da cozinha.
        this.controls.target.copy(center);

        // Limites de aproximação e afastamento.
        this.controls.minDistance = maxDimension * 0.35;
        this.controls.maxDistance = maxDimension * 3;

        // Limites de deslocamento do ponto de interesse.
        this.controls.minTargetRadius = 0;
        this.controls.maxTargetRadius = maxDimension * 1.5;

        // Limites de rotação vertical.
        // Impede que a câmara passe para baixo do chão.
        this.controls.minPolarAngle = 0.15;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        // Atualizar a câmara.
        this.controls.update();


        this.resize();
    }


    private createKitchen(): void {
        const { x, y, z } = this.configuration.dimensions;


const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(x, z),
    new THREE.MeshStandardMaterial({
        color: 0xb0b0b0,
        roughness: 0.9,
        metalness: 0.0,
    }),
);

floor.rotation.x = -Math.PI / 2;
floor.position.set(x / 2, 0, z / 2);

// O chão recebe sombras, mas não precisa de as projetar.
floor.receiveShadow = true;
floor.castShadow = false;

this.scene.add(floor);


        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xdce2e8,
            side: THREE.DoubleSide,
        });

        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(x, y),
            wallMaterial,
        );

        backWall.position.set(x / 2, y / 2, 0);
        backWall.receiveShadow = true;

        this.scene.add(backWall);

        const sideWall = new THREE.Mesh(
            new THREE.PlaneGeometry(z, y),
            wallMaterial,
        );

        sideWall.rotation.y = Math.PI / 2;
        sideWall.position.set(0, y / 2, z / 2);
        sideWall.receiveShadow = true;
        this.scene.add(sideWall);

        const SHOW_DEBUG_GRID = false;

        if (SHOW_DEBUG_GRID) {
            const grid = new THREE.GridHelper(
                Math.max(x, z),
                Math.max(x, z) * 2,
                0x667788,
                0x667788,
            );

            grid.position.set(x / 2, 0.01, z / 2);
            this.scene.add(grid);
        }
    }






private createLights(): void {
    const configuredLights = this.configuration.lights ?? [];

    this.lightGui = new GUI({
        autoPlace: false,
        title: 'Light Controls',
        width: 280,
    });

    this.guiContainer.nativeElement.appendChild(
        this.lightGui.domElement
    );

    configuredLights.forEach((light, index) => {
        const color = light.color ?? '#ffffff';

        let threeLight: THREE.Light | null = null;

        switch (light.type) {
            case 'ambient': {
                threeLight = new THREE.AmbientLight(
                    color,
                    light.intensity
                );
                break;
            }

            case 'hemisphere': {
                threeLight = new THREE.HemisphereLight(
                    light.skyColor ?? '#ffffff',
                    light.groundColor ?? '#555555',
                    light.intensity
                );
                break;
            }


case 'directional': {
    const directional = new THREE.DirectionalLight(
        color,
        light.intensity
    );

    this.setLightPosition(
        directional,
        light.position
    );

    if (light.target) {
        directional.target.position.fromArray(
            light.target
        );
    }

    // A luz direcional é responsável pelas sombras.
    directional.castShadow = light.castShadow ?? true;

    if (directional.castShadow) {
        directional.shadow.mapSize.set(2048, 2048);

        directional.shadow.camera.left = -12;
        directional.shadow.camera.right = 12;
        directional.shadow.camera.top = 12;
        directional.shadow.camera.bottom = -12;

        directional.shadow.camera.near = 0.1;
        directional.shadow.camera.far = 50;

        directional.shadow.bias = -0.0005;
        directional.shadow.normalBias = 0.02;
        directional.shadow.radius = 3;

        directional.shadow.camera.updateProjectionMatrix();
    }

    this.scene.add(directional.target);

    threeLight = directional;
    break;
}


            case 'point': {
                const point = new THREE.PointLight(
                    color,
                    light.intensity,
                    light.distance ?? 0,
                    light.decay ?? 2
                );

                this.setLightPosition(
                    point,
                    light.position
                );

                threeLight = point;
                break;
            }

            case 'spot': {
                const spot = new THREE.SpotLight(
                    color,
                    light.intensity,
                    light.distance ?? 0,
                    light.angle ?? Math.PI / 4,
                    light.penumbra ?? 0.3,
                    light.decay ?? 2
                );

                this.setLightPosition(
                    spot,
                    light.position
                );

                if (light.target) {
                    spot.target.position.fromArray(
                        light.target
                    );
                }

                spot.castShadow = light.castShadow ?? false;

                if (spot.castShadow) {
                    spot.shadow.mapSize.set(2048, 2048);

                    spot.shadow.camera.near = 0.1;
                    spot.shadow.camera.far = 50;

                    spot.shadow.bias = -0.0005;
                    spot.shadow.normalBias = 0.02;
                    spot.shadow.radius = 3;

                    spot.shadow.camera.updateProjectionMatrix();
                }

                this.scene.add(spot.target);

                threeLight = spot;
                break;
            }
        }

        if (!threeLight) {
            console.warn(`Unsupported light type: ${light.type}`);
            return;
        }

        this.scene.add(threeLight);

        this.createLightControls(
            light,
            threeLight,
            index
        );
    });
}




private createLightControls(
    light: KitchenLight,
    threeLight: THREE.Light,
    index: number
): void {
    const folder = this.lightGui!.addFolder(
        `Light ${index + 1} - ${light.type.toUpperCase()}`
    );

    const state = {
        enabled: threeLight.visible
    };

    const controllers: Array<{
        disable: (disabled?: boolean) => unknown
    }> = [];

    // POWER ON / OFF
    folder.add(state, 'enabled')
        .name('Power')
        .onChange((enabled: boolean) => {
            threeLight.visible = enabled;

            controllers.forEach(controller => {
                controller.disable(!enabled);
            });
        });

    // INTENSITY
    const maxIntensity =
        light.type === 'ambient' ? 1.5 :
        light.type === 'directional' ? 4 :
        light.type === 'spot' ? 5 :
        5;

    controllers.push(
        folder.add(light, 'intensity', 0, maxIntensity, 0.1)
            .name('Intensity')
            .onChange((value: number) => {
                threeLight.intensity = value;
            })
    );

    // COLOR
    if (light.type !== 'hemisphere') {
        light.color ??= '#ffffff';

        controllers.push(
            folder.addColor(light, 'color')
                .name('Color')
                .onChange((value: string) => {
                    const coloredLight = threeLight as
                        THREE.AmbientLight |
                        THREE.DirectionalLight |
                        THREE.PointLight |
                        THREE.SpotLight;

                    coloredLight.color.set(value);
                })
        );
    }

    // HEMISPHERE COLORS
    if (light.type === 'hemisphere') {
        light.skyColor ??= '#ffffff';
        light.groundColor ??= '#555555';

        const hemisphere = threeLight as THREE.HemisphereLight;

        controllers.push(
            folder.addColor(light, 'skyColor')
                .name('Sky Color')
                .onChange((value: string) => {
                    hemisphere.color.set(value);
                })
        );

        controllers.push(
            folder.addColor(light, 'groundColor')
                .name('Ground Color')
                .onChange((value: string) => {
                    hemisphere.groundColor.set(value);
                })
        );
    }

    // SPOTLIGHT CONTROLS
    if (light.type === 'spot') {
        const spot = threeLight as THREE.SpotLight;

        light.angle ??= Math.PI / 4;
        light.penumbra ??= 0.3;

        controllers.push(
        folder.add(light, 'angle', 0.2, 1.3, 0.01)
            .name('Cutoff Angle')
            .onChange((value: number) => {
                spot.angle = value;
            })
        );

        controllers.push(
            folder.add(light, 'penumbra', 0, 1, 0.01)
                .name('Penumbra')
                .onChange((value: number) => {
                    spot.penumbra = value;
                })
        );
    }

    folder.open();
}





    private setLightPosition(
        light: THREE.Light,
        position?: number[],
    ): void {
        if (position) {
            light.position.fromArray(position);
        }
    }



private createEquipment(): void {
    for (const equipment of this.configuration.equipment) {

        const equipmentGroup = new THREE.Group();
        const currentLoadVersion = this.modelLoadVersion;

        equipmentGroup.name = equipment.id;

        equipmentGroup.position.fromArray(equipment.position);

        equipmentGroup.rotation.set(
            equipment.rotation[0],
            equipment.rotation[1],
            equipment.rotation[2]
        );

        equipmentGroup.scale.set(
            equipment.scale[0],
            equipment.scale[1],
            equipment.scale[2]
        );

        this.scene.add(equipmentGroup);

        // Fallback para equipamentos sem modelo 3D.
        if (!equipment.modelUrl) {
            equipmentGroup.add(
                this.createProceduralEquipment(equipment)
            );
            continue;
        }

        this.gltfLoader.load(
            equipment.modelUrl,

            // SUCCESS
            (gltf) => {

                // Ignorar modelos de configurações antigas.
                if (
                    currentLoadVersion !== this.modelLoadVersion ||
                    equipmentGroup.parent !== this.scene
                ) {
                    gltf.scene.traverse(object => {
                        const mesh = object as THREE.Mesh;

                        if (mesh.geometry) {
                            mesh.geometry.dispose();
                        }

                        if (mesh.material) {
                            const materials = Array.isArray(mesh.material)
                                ? mesh.material
                                : [mesh.material];

                            materials.forEach(material => material.dispose());
                        }
                    });

                    return;
                }

                const model = gltf.scene;

                model.traverse(object => {
                    if (object instanceof THREE.Mesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                });

                // Centrar o modelo.
                const bounds = new THREE.Box3().setFromObject(model);
                const center = bounds.getCenter(new THREE.Vector3());

                model.position.x -= center.x;
                model.position.y -= bounds.min.y;
                model.position.z -= center.z;

                // Adicionar o modelo à cozinha.
                equipmentGroup.add(model);

            },

            undefined,

            // ERROR
            (error) => {

                console.error(
                    `Erro ao carregar o modelo ${equipment.id}:`,
                    error
                );

                if (
                    currentLoadVersion !== this.modelLoadVersion ||
                    equipmentGroup.parent !== this.scene
                ) {
                    return;
                }

                // Mostrar equipamento procedural se o GLB falhar.
                if (equipmentGroup.children.length === 0) {
                    equipmentGroup.add(
                        this.createProceduralEquipment(equipment)
                    );
                }
            }
        );
    }
}


    private createProceduralEquipment(
        equipment: KitchenEquipment,
    ): THREE.Group {
        const group = new THREE.Group();

        const createBox = (
            width: number,
            height: number,
            depth: number,
            color: number,
            x: number,
            y: number,
            z: number,
        ): THREE.Mesh => {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, depth),
                new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.55,
                    metalness: 0.3,
                }),
            );

            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            group.add(mesh);
            return mesh;
        };

        const steel = 0xaaaaaa;
        const dark = 0x292929;
        const glass = 0x263746;

        switch (equipment.category) {
            case 'oven':
                // Corpo do forno.
                createBox(1.2, 1.1, 1, steel, 0, 0.55, 0);

                // Porta frontal.
                createBox(0.85, 0.55, 0.04, dark, 0, 0.55, 0.52);

                // Vidro da porta.
                createBox(0.65, 0.35, 0.025, glass, 0, 0.55, 0.55);

                // Puxador.
                createBox(0.7, 0.045, 0.07, dark, 0, 0.88, 0.58);

                // Painel superior.
                createBox(1.2, 0.2, 1, dark, 0, 1.2, 0);
                break;

            case 'fridge':
                // Corpo do frigorífico.
                createBox(1, 1.9, 0.9, steel, 0, 0.95, 0);

                // Duas portas.
                createBox(0.47, 1.75, 0.035, 0xb9c7d0, -0.24, 0.95, 0.47);
                createBox(0.47, 1.75, 0.035, 0xb9c7d0, 0.24, 0.95, 0.47);

                // Puxadores.
                createBox(0.035, 0.65, 0.045, dark, -0.04, 0.95, 0.51);
                createBox(0.035, 0.65, 0.045, dark, 0.04, 0.95, 0.51);
                break;

            case 'counter':
                // Armário inferior.
                createBox(1.8, 0.85, 0.8, steel, 0, 0.425, 0);

                // Tampo de preparação.
                createBox(1.9, 0.09, 0.9, 0xdddddd, 0, 0.895, 0);

                // Portas frontais.
                createBox(0.55, 0.7, 0.025, 0x777777, -0.6, 0.43, 0.415);
                createBox(0.55, 0.7, 0.025, 0x777777, 0.0, 0.43, 0.415);
                createBox(0.55, 0.7, 0.025, 0x777777, 0.6, 0.43, 0.415);
                break;

            default:
                createBox(
                    1,
                    1,
                    1,
                    this.getEquipmentColor(equipment.category),
                    0,
                    0.5,
                    0,
                );
                break;
        }

        return group;
    }


    private getEquipmentColor(category?: string): number {
        switch (category) {
            case 'oven': return 0x555555;
            case 'counter': return 0xaaaaaa;
            case 'fridge': return 0xb0c4de;
            case 'sink': return 0x4682b4;
            case 'storage': return 0x8b7355;
            default: return 0xc49a6c;
        }
    }

    private resize(): void {
        if (!this.renderer || !this.camera) return;

        const element = this.container.nativeElement;
        const width = element.clientWidth;
        const height = element.clientHeight;

        if (!width || !height) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private animate = (): void => {
        this.animationFrame = requestAnimationFrame(this.animate);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };


ngOnDestroy(): void {
    this.initialized = false;

    // Invalida todos os carregamentos GLB pendentes.
    this.modelLoadVersion++;

    this.lightGui?.destroy();
    this.lightGui = undefined;

    cancelAnimationFrame(this.animationFrame);

    this.resizeObserver?.disconnect();

    this.controls?.dispose();

    if (this.scene) {
        this.disposeSceneObjects();
    }

    this.renderer?.dispose();
    this.renderer?.domElement.remove();

    this.guiContainer?.nativeElement.replaceChildren();
}

}
