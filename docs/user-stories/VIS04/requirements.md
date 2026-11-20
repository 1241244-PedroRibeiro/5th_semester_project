# VIS04 — Textures and Materials

## 1. Requirements Engineering

### 1.1. User Story Description

As a LaPizza Manager, I want 3D models rendered with appropriate textures, so that each element looks realistic.

### 1.2. Customer Specifications and Clarifications

#### From the specification document
> Extracted from *PART IV — Sprint 2 — User Stories* (VIS04, p. 15).

- **Distinct textures and materials** for each 3D object.
- For **procedural** models, retrieve texture and material properties and URLs from the back end as JSON. (Baseline ships **imported GLBs**, so the textures are embedded in the GLB and referenced by the GLB's own materials — the layout JSON does not declare per-equipment texture URLs in the baseline; see §1.7.2 for the decision.)
- **Minimum map set:** colour map **plus at least one of** roughness, bump, or normal.
- **Performance:** textures and materials must not significantly degrade performance or loading time.

#### From `3d-assets-guide.md`, ADR-014, KB §53–§54

- **PBR map set per material (guide §7.1):** base colour (`_basecolor.jpg`, 85% q, 2048²), normal (`_normal.jpg`, 90% q, 2048²), roughness (`_roughness.jpg`, 85% q, 1024²), optional metalness / AO / emissive.
- **Colour-space rule (critical, guide §7.1):** `map` and `emissiveMap` default to `SRGBColorSpace`; `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap` must be **explicitly set to `NoColorSpace`**. This is the #1 source of "my model looks wrong in the browser" bugs.
- **Material class per use case (KB §53.1):** `MeshStandardMaterial` (PBR) for realism. `MeshPhysicalMaterial` only for glass/water. `MeshLambertMaterial`/`MeshPhongMaterial` are not needed for the mandatory scene; basic materials (`MeshBasicMaterial`) are acceptable only for the debug helpers, not for equipment.
- **Texture sourcing/licensing (guide §7.2):** CC0 preferred (Poly Haven, freepbr, ambientCG). Every third-party asset must have a `_credits.md` at its folder root — this is checked at review time.
- **Texture resolution cap (guide §6):** ≤ 2048 × 2048 per map.
- **Performance budget (guide §6):** total GLB payload ≤ 15 MB, per-GLB ≤ 5 MB, ≤ 40 draw calls, ≤ 250k triangles.
- **`Texture.colorSpace` and `material.map`** are set from the GLB's embedded materials by `GLTFLoader` when the GLB is correctly authored; the viewer must **not** re-set `colorSpace` after load unless a map is explicitly overridden. This is a documented "don't touch what GLTFLoader got right" rule (guide §7.1).
- **`anisotropy` (KB §54.8):** the renderer's `getMaxAnisotropy()` is applied to all loaded textures for quality on inclined surfaces.
- **`envMap` (KB §53.4, guide §3):** a `CubeTextureLoader` loads `frontend/public/assets/3d/env/studio_*x.jpg` for IBL. The `envMap` is applied to `scene.environment` (Three.js r155+ convention) so all PBR materials pick it up automatically.

### 1.3. Acceptance Criteria (expanded, testable)

#### AC1 — Distinct textures and materials per object
- AC1.1 Every equipment model (VIS02 AC3) has its own material instance (not shared by accident) — verified by asserting `mesh.material !== otherMesh.material` when the two meshes come from different GLBs.
- AC1.2 Within a single GLB, meshes may share materials — that is expected and allowed.
- AC1.3 The floor plane uses a distinct material (a `MeshStandardMaterial` with a wood or concrete `map` and a `roughnessMap`) — not the default white `MeshStandardMaterial`.
- AC1.4 A `MeshBasicMaterial` (flat, unlit) is used **only** for debug helpers (grid, axes), never for equipment.

#### AC2 — Minimum map set per equipment
- AC2.1 Every equipment GLB authored by the team exposes, per mesh material, at least: a `map` (base colour) **and** at least one of `normalMap`, `bumpMap`, or `roughnessMap` populated in the GLB.
- AC2.2 The verification script `make validate-assets` (or an equivalent dev check) asserts this for each `.glb` in `frontend/public/assets/3d/models/`. A model that lacks the minimum map set is reported as a **warning** during development (not a build error) and blocks the SGRAI review per `3d-assets-guide.md` §11 item 4/8.
- AC2.3 The reference layout's 6 GLBs (`counter_main`, `receiving_platform`, `conveyor_main`, `arm_articulated`, `dispenser_cheese`, `oven_woodfired`) satisfy AC2.1. Any deviation must be justified in the PR.

#### AC3 — PBR materials and correct colour spaces
- AC3.1 Every equipment material is `MeshStandardMaterial` or `MeshPhysicalMaterial` after GLTF import (this is what GLTFLoader produces for `pbrMetallicRoughness` materials).
- AC3.2 For every loaded texture, `colorSpace` must be `SRGBColorSpace` for `map`/`emissiveMap` and `NoColorSpace` for `normalMap`/`roughnessMap`/`metalnessMap`/`aoMap`. `GLTFLoader` sets these correctly when the GLB is authored per guide §5.2; the viewer **must not override** them.
- AC3.3 The viewer sets `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` for all textures traversed after load (quality vs. cost — bounded by GPU capability).
- AC3.4 `scene.environment` is set to the studio cube map (§1.2 `envMap`); `scene.background` is a neutral colour or the same cube map at low intensity, per the visual identity decided in WEB02. `MeshStandardMaterial` picks up IBL automatically.

#### AC4 — Procedural-model contract (baseline not used, but specified)
- AC4.1 If a future equipment item is authored procedurally, its texture/material URLs **must** be added to the layout JSON under a documented extension (e.g., `equipment[].textures.{map, normalMap, roughnessMap}`) — with a `$defs` addition to `kitchen-schema.json`. This is not used in the Sprint 2 baseline; the field is reserved.
- AC4.2 The baseline layout JSON contains no per-equipment texture URLs (they are embedded in the GLBs). This is consistent with the US's "For procedural models" qualifier — it does not require redundant URLs for imported GLBs.

#### AC5 — Performance
- AC5.1 Loading time of all textures/GLBs for the reference layout is ≤ 3 s on the reference machine (guide §6).
- AC5.2 Draw calls and triangles remain within the guide §6 budget (`≤ 40`, `≤ 250_000`).
- AC5.3 Texture resolution per map is ≤ 2048 × 2048 (guide §6). Any map larger than that is downsampled at authoring time (not at runtime).
- AC5.4 Total GLB payload for the reference layout ≤ 15 MB.

### 1.4. Found out Dependencies

**Preceding:**
- VIS02 (GLB loading).
- Asset authoring per `3d-assets-guide.md` §5–§7.
- `frontend/public/assets/3d/env/studio_{px,nx,py,ny,pz,nz}.jpg` present (CubeTextureLoader).

**Succeeding:**
- VIS05/VIS06 (lighting affects the PBR result, but does not change the textures).
- VIS07 (camera moves; textures must hold up under all viewing angles → anisotropy matters).

### 1.5. Input and Output Data

#### 1.5.1. Texture set per equipment (from guide §7.1, abridged for the reference layout)

| Equipment | Base colour | Normal | Roughness | Notes |
|---|---|---|---|---|
| `counter_main` | `wood_basecolor.jpg` 2048² | `wood_normal.jpg` 2048² | `wood_roughness.jpg` 1024² | wood grain; visible on top and front |
| `conveyor_main` | `belt_basecolor.jpg` 1024² | (optional) | `belt_roughness.jpg` 512² | rubber matte |
| `oven_woodfired` | `brick_basecolor.jpg` 2048² | `brick_normal.jpg` 2048² | `brick_roughness.jpg` 1024² | plus `brick_ao.jpg` 1024² optional |
| `arm_articulated` | `metal_basecolor.jpg` 1024² | `metal_normal.jpg` 1024² | `metal_roughness.jpg` 1024² | metallic |
| `dispenser_cheese` | `steel_basecolor.jpg` 1024² | — | `steel_roughness.jpg` 512² | brushed steel |
| `receiving_platform` | `wood_basecolor.jpg` 2048² | (shared with counter) | (shared) | shares counter material |

#### 1.5.2. Environment cube map

`frontend/public/assets/3d/env/studio_{px,nx,py,ny,pz,nz}.jpg` (6 faces). Loaded once at module init via `CubeTextureLoader`. `mapping = THREE.CubeReflectionMapping`.

#### 1.5.3. Materials — after GLTF import

`GLTFLoader` returns `gltf.scene` with meshes whose `material` is a `MeshStandardMaterial` (or `MeshPhysicalMaterial`), with `map`, `normalMap`, `roughnessMap`, `metalness`, `roughness` populated from the GLB's PBR material. The viewer must not replace these materials.

### 1.6. System Sequence Diagrams (SSD)

#### 1.6.1. Texture traversal after load (anisotropy + no colour-space override)

```mermaid
sequenceDiagram
autonumber
title VIS04 - Texture traversal after load
    participant Builder as SceneBuilder
    participant Assets as AssetService
    participant Scene as THREE.Scene
    participant Renderer as WebGLRenderer
    participant Env as CubeTextureLoader

    Builder->>Env: load(['studio_px.jpg', … 'studio_nz.jpg'])
    Env-->>Builder: CubeTexture (mapping = CubeReflectionMapping)
    Builder->>Scene: scene.environment = cubeTexture
    loop for each equipment GLB
        Builder->>Assets: load(modelUrl)
        Assets-->>Builder: gltf
        Builder->>Scene: traverse(gltf.scene, mesh => {
            mesh.castShadow = true  // (VIS05)
            mesh.receiveShadow = true
            for each tex of [material.map, normalMap, roughnessMap, metalnessMap, aoMap, emissiveMap]:
                if tex: tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
            // DO NOT set colorSpace — GLTFLoader already set it correctly from the GLB.
        })
    end
```

#### 1.6.2. Procedural-model extension path (baseline not used)

```mermaid
sequenceDiagram
autonumber
title VIS04 - Procedural extension (future, documented, not baseline)
    participant Manager
    participant WEB06 as KitchenConfigListComponent
    participant Validator as SchemaValidator
    participant Viewer as KitchenViewerComponent

    Manager->>WEB06: add equipment with textures.{map,normalMap,roughnessMap}
    WEB06->>Validator: validate against kitchen-schema.json (requires $defs.equipmentItem.textures)
    alt schema extension not present
        Validator-->>WEB06: error "additionalProperties"
        WEB06-->>Manager: field error
    else extension accepted (future migration)
        WEB06->>Viewer: layout includes texture URLs
        Viewer->>Viewer: load textures via TextureLoader; set colorSpace per map kind
    end
```

### 1.7. Other Relevant Remarks

#### 1.7.1. Component architecture

```mermaid
classDiagram
    class SceneBuilder {
        +loadEnvironment()
        +applyAnisotropy(root, maxAniso)
    }
    class MaterialValidator {
        +checkMinimumMaps(gltf): { ok, missing[] }
    }
    class AssetService {
        +load(url): Promise~GLTF~
    }
    SceneBuilder --> AssetService
    SceneBuilder --> MaterialValidator
```

`MaterialValidator` is a dev-only helper invoked by the `make validate-assets` script and by unit tests — it does not run in production but its logic is exercised in CI.

#### 1.7.2. Decision record — embedded textures vs. layout-declared texture URLs

The Sprint 2 US text says "For procedural models, retrieve texture and material properties and URLs from the back end as JSON." The **baseline ships imported GLBs** (ADR-014), and GLB **already embeds** its textures and materials. Duplicating texture URLs in the layout JSON would:
- require a `$defs` extension to `kitchen-schema.json` (adding ~100 lines of schema),
- risk divergence between the GLB's material and the layout's declared material,
- provide no functional benefit (the GLB's internal material is authoritative).

**Decision:** the baseline does **not** declare per-equipment texture URLs in the layout JSON. The procedural path remains available via the documented extension (§1.6.2) and is not implemented in Sprint 2. This is a **documented** interpretation of the US qualifier "For procedural models", not a silent omission.

**Alternatives considered:**
- *Declare all textures in the layout JSON even for GLBs*: rejected — duplication, no benefit, and the GLB spec already mandates embedded materials for self-contained assets.
- *Procedural-only models*: rejected — the guide/ADR-014 chose GLB precisely to avoid this.

#### 1.7.3. Error/status matrix

| Condition | Source | UI |
|---|---|---|
| All maps present | asset check | normal render |
| Missing `normalMap`/`roughnessMap`/`bumpMap` on a mesh | asset check (dev) | warning in `make validate-assets`; blocks SGRAI review (guide §11) |
| Texture > 2048² | asset check | warning; reviewer asks for downsample |
| Texture colour space wrong (sRGB on normal) | manual review | pink/wrong-looking normal shading — troubleshooting table (guide §12) |
| Env cube map 404 | runtime | scene renders without reflections; console warning; user-visible behaviour unchanged |
| Total GLB payload > 15 MB | asset check | warning; performance budget violation flagged |

#### 1.7.4. Verification

- **Unit:** `MaterialValidator.checkMinimumMaps` returns `ok=false` for a GLB missing `normalMap`/`roughnessMap`/`bumpMap`; returns `ok=true` for the 6 reference GLBs (asserted via `npx gltf-inspect` output parsing).
- **Dev check (`make validate-assets`):** for each `.glb`, assert per-mesh `map` present and at least one of `{normalMap, roughnessMap, bumpMap}` present; assert each texture dimension ≤ 2048.
- **Integration:** after loading the reference layout, assert `mesh.material` is `MeshStandardMaterial`; assert `material.map.colorSpace === 'srgb'` and `material.normalMap?.colorSpace === ''` (NoColorSpace) — the second assertion catches the #1 bug in guide §12.
- **Performance:** `renderer.info.memory.textures` count; assert total payload on disk ≤ 15 MB; measure first-paint ≤ 3 s.
- **Demo:** side-by-side "before/after" of one PBR model with and without `envMap` (removing `scene.environment` → materials look flat); show a normal-map toggle in the demo (setting `material.normalMap = null` and back) to prove the normal map is loaded and used.