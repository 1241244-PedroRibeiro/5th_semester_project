# 3D Asset Pipeline Guide — SGRAI (VIS01–VIS07)

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** SGRAI
**Scope:** Sprint 2 baseline + Sprint 3 readiness
**Version:** 1.0
**Related artefacts:** ADR-014, ADR-011, `kitchen-schema.json`, `kitchen-layout-example.json`, KB §34, KB Master §50–§56

---

## 1. Purpose

This guide formalises the **3D asset pipeline** adopted by the LaPrizza SGRAI
team, from Blender source to in-browser rendering. It is the working
reference for:

1. Choosing the asset format (GLB, exclusively — ADR-014).
2. Structuring folders and naming files.
3. Exporting from Blender with reproducible options.
4. Meeting the performance budget (VIS02–VIS07).
5. Authoring textures and materials in PBR.
6. Preparing assets for Sprint 3 animation without rework.
7. Loading them from the Angular SPA + Three.js canvas.
8. Validating the pipeline before handover.

Every choice in this guide is either mandated by a Course deliverable
(VIS02–VIS07) or justified by a technical constraint documented in ADR-014
and KB §34. Anything not covered here falls under the general SGRAI guidance
of the KB Master (§50–§56).

---

## 2. Format decision (recap of ADR-014)

**Only GLTF 2.0 binary (`.glb`)** is accepted. No OBJ, FBX, STL, DAE, or
procedural-only scenes.

| Format | Binary | Materials | Textures | Skeletal animation | Accepted |
|---|---|---|---|---|---|
| GLB (GLTF 2.0 binary) | ✅ | ✅ | ✅ embedded | ✅ | **Yes** |
| GLTF (JSON + separate `.bin`) | ❌ | ✅ | ✅ referenced | ✅ | No (multi-file, CORS friction) |
| OBJ + MTL | ❌ | ⚠ partial | ✅ referenced | ❌ | No |
| FBX | ✅ | ✅ | ✅ | ✅ | No (proprietary loader, unreliable) |
| STL | ✅ | ❌ | ❌ | ❌ | No (violates VIS04) |
| USDZ | ✅ | ✅ | ✅ | ✅ | Not used (browser support gaps in 2026) |

**Rationale:** GLB encapsulates geometry, materials, textures, and animation
tracks in a single file. It eliminates the CORS pain of multi-file OBJ+MTL
imports, is compressed (Draco or meshopt), and is what Three.js's `GLTFLoader`
is optimized for. It is also the only way to satisfy the Sprint 3 animation
requirement without re-authoring assets.

---

## 3. Repository and deployment layout

Assets are versioned in git under the frontend's `public/` folder, so that
they are served directly by Nginx at the URL path declared in the kitchen
layout:

```
frontend/
└── public/
    └── assets/
        └── 3d/
            ├── models/
            │   ├── counter_main.glb
            │   ├── receiving_platform.glb
            │   ├── conveyor_main.glb
            │   ├── arm_articulated.glb
            │   ├── dispenser_cheese.glb
            │   ├── dispenser_sauce.glb
            │   ├── oven_woodfired.glb
            │   └── fridge_under_counter.glb
            ├── textures/
            │   ├── oven/
            │   │   ├── brick_basecolor.jpg
            │   │   ├── brick_normal.jpg
            │   │   ├── brick_roughness.jpg
            │   │   └── brick_ao.jpg
            │   ├── conveyor/
            │   │   └── belt_basecolor.jpg
            │   └── counter/
            │       └── wood_basecolor.jpg
            └── env/
                ├── studio_posx.jpg
                ├── studio_negx.jpg
                ├── studio_posy.jpg
                ├── studio_negy.jpg
                ├── studio_posz.jpg
                └── studio_negz.jpg
```

**URL mapping.** A file at `frontend/public/assets/3d/models/oven_woodfired.glb`
is served at `/assets/3d/models/oven_woodfired.glb`. This is the path
referenced by `modelUrl` in the kitchen schema
(`^/assets/3d/models/[A-Za-z0-9_\-/]+\.glb$`).

**Why `public/` (not `src/assets/`).** Angular's application builder copies
`public/**` verbatim to the build output. `src/assets/` triggers webpack-style
hashed filenames; those break the referential-integrity check in the kitchen
validator (ADR-011 §Consequences).

**Shared folder mirror.** The same bytes are also mounted (read-only) at
`/shared/3d-assets/models/` in the deployment (see `sys-shared-folder.md`).
This is for operational recovery; the *public* URL path is always the
`frontend/public/assets/3d/` mirror served by Nginx.

---

## 4. Naming conventions

File names are **`lowercase_with_underscores.glb`**. The stem must match the
`id` of the equipment item in the layout JSON, up to the equipment-type
category:

| File name | Category | `id` in layout JSON |
|---|---|---|
| `oven_woodfired.glb` | oven | `oven-main` |
| `conveyor_main.glb` | conveyor | `conveyor-main` |
| `arm_articulated.glb` | robot_arm | `arm-pizza-01` |
| `dispenser_cheese.glb` | dispenser | `dispenser-cheese` |

The correspondence is **not enforced by schema** (the `id` is independent),
but it is a **review-time invariant**: any reviewer can find the source of a
model by reading the `modelUrl`. If the correspondence is broken, the
reviewer asks for a justification in the PR.

Rules:

- **Length:** ≤ 60 characters (stem + `.glb`).
- **No version suffixes** in the filename (`oven_v2.glb` → reject). Versioning
  is git history, not file names. If a breaking asset change is required, the
  **file is replaced** and the git diff documents the change.
- **No spaces, no uppercase, no accents.**

---

## 5. Blender export pipeline

This is the **canonical** export procedure. Deviating from it requires a
recorded justification (e.g., Draco compression must be enabled in **both**
Blender and the Three.js loader — see §5.3).

### 5.1. Authoring conventions

- **Units:** metric, scale 1.0 (Blender `Properties → Scene Properties → Units`).
- **Up axis:** Blender's default `+Z up` is fine — GLTF exporter converts to `+Y up` automatically.
- **Origin:** model origin at the **floor contact point** (not the visual centre). This keeps the placement in the layout JSON trivial: `position` is the floor coordinate, not the model centroid.
- **Transform applied:** `Ctrl+A → All Transforms` before export, so the GLB carries no residual rotation/scale.
- **Facing direction:** models face `+Z` in Blender (which becomes `+Z` in Three.js after conversion — consistent with the front-facing convention used by the layout example).

### 5.2. Export options (`File → Export → glTF 2.0`)

| Option | Value | Reason |
|---|---|---|
| Format | `glTF Binary (.glb)` | ADR-014 |
| Include → Selected Objects | `true` | avoid exporting the whole scene |
| Transform → `+Y up` | `true` | Three.js convention (KB Master §50.4) |
| Geometry → Apply Modifiers | `true` | bake modifiers into geometry |
| Geometry → UVs | `true` | textures depend on it |
| Geometry → Normals | `true` | lighting depends on it |
| Geometry → Tangents | `true` if normal maps are used | normal maps require tangents |
| Geometry → Vertex Colors | `false` unless intentionally used | keeps payload small |
| Geometry → Materials | `Export` | PBR materials |
| Animation → Animations | `true` | Sprint 3 readiness |
| Animation → NLA Strips | `true` | preserve action names |
| Compression → Draco | `false` for models < 2 MB, `true` for models > 5 MB | see §6.3 |
| `Y up` variant | `+Y up` (not `+Z up`) | consistent with three.js |

### 5.3. Draco compression caveat

If Draco is enabled, the loader must install the decoder:

```typescript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
const draco = new DRACOLoader();
draco.setDecoderPath('/assets/3d/draco/');
```

The decoder files are published by the Three.js distribution
(`node_modules/three/examples/jsm/libs/draco/`) and must be copied to
`frontend/public/assets/3d/draco/`. **Both** the encoder (Blender export)
and the decoder (Three.js load) must be Draco-enabled — a mismatch fails at
runtime with `THREE.DRACOLoader: decode error`.

For Sprint 2, Draco is **disabled** (only simple models, no need for the
extra moving part).

### 5.4. Reproducibility statement

An asset is considered **reproducible** if:

1. Its `.blend` source is committed under `frontend/public/assets/3d/sources/`
   (excluded from the build output via `.gitignore` rules that keep `sources/`
   out of the Nginx image).
2. The export options in §5.2 are recorded in `sources/<model>.export.txt`.
3. A CI job (`make validate-assets`) re-exports and diffs the `.glb` size and
   SHA-256; a divergence > 1% requires explicit acknowledgement in the PR.

This is a *guideline*, not a hard gate for Sprint 2 — the hard gate is §8.

---

## 6. Performance budget (VIS02–VIS07)

The mandatory scene (Kitchen Visualization, VIS01) must run at ≥ 30 fps on a
mid-range laptop (Intel Iris Xe or equivalent). The following budget has been
measured against a representative kitchen (6 models, 4 lights, one shadow-
casting directional light):

| Dimension | Budget | How to measure |
|---|---|---|
| Total GLB payload | ≤ 15 MB | `du -sh frontend/public/assets/3d/models/` |
| Single GLB | ≤ 5 MB | `ls -la *.glb` |
| Polygons / scene | ≤ 250,000 | Three.js `renderer.info.render.triangles` |
| Draw calls | ≤ 40 | `renderer.info.render.calls` |
| Lights that cast shadows | ≤ 1 | grep `castShadow` in layout JSON |
| Shadow map size | ≤ 1024 × 1024 | `light.shadow.mapSize` |
| Texture resolution (per map) | ≤ 2048 × 2048 | `identify` (ImageMagick) |
| Startup time (first paint of scene) | ≤ 3 s | Chrome DevTools Performance |

**Why these numbers.** Draw calls are the dominant CPU cost; the KB Master
§54.1 reminds us that each shadow-casting light re-renders the scene. Keeping
the shadow-casting light to one (the directional "sun") keeps the shadow
budget at 1 shadow map. All values were validated against the
`kitchen-layout-example.json` shipped with this guide.

---

## 7. Textures and materials

### 7.1. PBR map set per material

Each material exports a set of PBR maps. The minimum viable set for a
LaPrizza scene:

| Map | Filename suffix | Compression | Notes |
|---|---|---|---|
| Base colour | `_basecolor.jpg` | 85% quality, 2048² | Use JPG, not PNG (no alpha needed) |
| Normal | `_normal.jpg` | 90% quality, 2048² | **Must be non-sRGB**; set `colorSpace: NoColorSpace` |
| Roughness | `_roughness.jpg` | 85% quality, 1024² | greyscale; can be packed with metalness |
| Metalness (optional) | `_metalness.jpg` | 85% quality, 1024² | pack with roughness into a single RGB texture if desired |
| Ambient occlusion (optional) | `_ao.jpg` | 85% quality, 1024² | requires a second UV channel (Three.js `uv2`) |
| Emissive (optional) | `_emissive.jpg` | 85% quality, 1024² | for oven fire / indicator lights |

**Colour spaces.** Three.js defaults `map` and `emissiveMap` to `sRGBColorSpace`;
roughness, metalness, normal, and AO must be **explicitly set to
`NoColorSpace`** (or their historic `linear` equivalent). This is the #1
source of "my model looks wrong in the browser" bugs.

### 7.2. Texture sourcing and licensing

Approved sources (CC0 or equivalent), per KB §34.5:

| Source | License | Notes |
|---|---|---|
| Poly Haven | CC0 | PBR textures; free commercial use |
| freepbr.com | CC0 | Materials aimed at game engines |
| ambientCG | CC0 | Large catalog; PBR-ready |
| Sketchfab (CC0 / CC-BY) | varies | Only use models with explicit "downloadable" and CC license |
| poly.pizza | CC-BY mostly | Credit required |

**Every third-party asset must have a `_credits.md` file at its folder root**
listing the source, license, and author. This is checked at review time and
referenced in the SGRAI presentation deck.

---

## 8. Animation readiness (Sprint 3)

VIS07 explicitly allows animation of the assembly line in Sprint 3. The
Sprint 2 pipeline must therefore export animation tracks **even though they
are not consumed yet**.

### 8.1. Track naming convention

In Blender, each animation action is named `equipmentId_actionName`. On
export, the GLB carries these names verbatim:

- `conveyor-main_run` — conveyor belt loop
- `arm-pizza-01_pick_place` — arm articulation
- `dispenser-cheese_dispense` — cheese drop

The kitchen layout's `animationTriggers` reference the **equipment id**, not
the track name — the mapping from `targetEquipmentId` to the clip name is the
renderer's responsibility (see §8.2). This decouples layout authoring from
Blender naming.

### 8.2. Loader integration (future)

```typescript
const gltf = await loader.loadAsync(modelUrl);
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
// Later, when Sprint 3 triggers the animation:
const clip = THREE.AnimationClip.findByName(gltf.animations, `${equipmentId}_run`);
if (clip) mixer.clipAction(clip).play();
```

Because the pipeline already exports the tracks, Sprint 3 will not require
asset re-exports for the mandatory scene. It will only require the mixer
wiring.

---

## 9. Loading in Angular + Three.js

The loading contract is a **single** `AssetService`, encapsulated so the 3D
canvas never sees the loader directly.

```typescript
// frontend/src/app/features/kitchen/asset.service.ts
import { Injectable } from '@angular/core';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LoadingManager } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly loader: GLTFLoader;

  constructor() {
    const manager = new LoadingManager();
    this.loader = new GLTFLoader(manager);
  }

  async load(modelUrl: string): Promise<GLTF> {
    // modelUrl is exactly the value persisted in the kitchen layout
    // e.g. "/assets/3d/models/oven_woodfired.glb"
    return this.loader.loadAsync(modelUrl);
  }
}
```

The kitchen component consumes:

```typescript
async renderLayout(layout: KitchenLayout): Promise<void> {
  for (const eq of layout.equipment) {
    const gltf = await this.assets.load(eq.modelUrl);
    gltf.scene.position.set(...eq.position);
    gltf.scene.rotation.set(...eq.rotation);
    gltf.scene.scale.set(...eq.scale);
    this.scene.add(gltf.scene);
  }
}
```

**Caveat (repeated in the code comments):** `eq.modelUrl` must be a **relative**
URL. A hardcoded `http://backend:3000/...` would break in the browser (the
browser cannot resolve Docker service names). This is why the asset is served
by the same Nginx that serves the SPA — the URL prefix is always `/assets/3d/`.

---

## 10. Integration with the Kitchen Configuration

The three artefacts form a closed loop:

```
kitchen-schema.json           kitchen-layout-example.json
        ↓ validates                        ↓ produces
        └───────► KitchenConfiguration.json_content (JSONB)
                                    ↓ consumed by
                          Three.js GLTFLoader.load(modelUrl)
                                    ↓ resolves to
              frontend/public/assets/3d/models/*.glb
```

**Any file under `frontend/public/assets/3d/models/` referenced by a persisted
layout must exist before `make up` runs**, because the loader fetches it at
runtime. Missing files are a §11 check failure, not a §3 failure.

---

## 11. Validation checklist

Before handing an asset to the SGRAI team lead:

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | File format | `file *.glb` | `glTF binary` |
| 2 | File size | `du -h *.glb` | ≤ 5 MB each |
| 3 | Contains textures | `npx gltf-inspect model.glb` | embedded images listed |
| 4 | Contains animations | same | non-empty `animations` |
| 5 | URL matches schema | `grep -o '"modelUrl": "[^"]*"' kitchen-layout-example.json \| sort -u` | all start with `/assets/3d/models/` and end with `.glb` |
| 6 | URL resolves to file | `ls frontend/public/assets/3d/models/$(basename <url>)` | exists |
| 7 | Referenced in a layout | `grep -c "<basename>" kitchen-layout-example.json` | ≥ 1 |
| 8 | Credits recorded | `cat sources/<model>.credits.md` | non-empty |

Item 8 is the licence-compliance gate; a missing credits file blocks merge.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `THREE.GLTFLoader: Unknown extension` | Model uses an unsupported GLTF extension | Re-export without the extension, or enable the loader plugin |
| `THREE.DRACOLoader: decode error` | Mismatch between encoder and decoder | Either disable Draco in both, or enable in both |
| Normal map looks flat | `normalMap.colorSpace` defaults to `sRGB` | Set `material.normalMap.colorSpace = THREE.NoColorSpace` |
| Model renders black | Missing light, or wrong material | Add at least `AmbientLight` (§53.3); check `material.color` was not set to `0x000000` |
| Model renders pink/magenta | Texture path 404 | Open DevTools Network; verify `/assets/3d/...` resolves |
| Kitchen doesn't load | `modelUrl` uses `http://` | Fix to `/assets/3d/...` |
| Shadows wrong or missing | `renderer.shadowMap.enabled = false`, or `castShadow` not set | See KB Master §54.2 |

---

## 13. References

- ADR-014 (Asset Pipeline), ADR-011 (Kitchen Config JSONB).
- `kitchen-schema.json`, `kitchen-layout-example.json`.
- LaPrizza KB v2.0 §34 (Three.js requirements), §34.5 (sources).
- KB Master 4.1 §50–§56 (Three.js, materials, textures, picking).
- Three.js docs — `GLTFLoader`, `DRACOLoader`, `Texture`, `PBR materials`.
- Blender docs — *glTF 2.0 exporter*.