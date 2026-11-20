# VIS01 — 3D Module Integration

## 1. Requirements Engineering

### 1.1. User Story Description

As a Project Manager, I want the team to develop and integrate a 3D visualization module into the SPA, so that users can interact with a visual representation of the LaPrizza kitchen.

### 1.2. Customer Specifications and Clarifications

#### From the specification document
> Extracted from *PART IV — Sprint 2 — User Stories* (VIS01, p. 13) and *PART II — System Specification* (§II.3.3, pp. 12–13).

- **Embedded component:** the 3D engine (Three.js or WebGL) is embedded as a **component** in the SPA (not a separate app, not an iframe).
- **Reuses SPA shell:** viewer uses the SPA's navigation and layout while **preserving existing functionality and authentication**.
- **Repository integration:** module source is integrated into the **existing repository structure** (no submodule, no parallel repo).
- **Framework freedom:** Clarification #07 — framework is a free choice; the mandatory deliverable is the Kitchen and Food Preparation Visualization (II.3.3.2). Build Your Pizza (II.3.3.1) is optional and **not** in Sprint 2 scope.
- **Mandatory scope for this US:** the module is *integrated*; the content it must render is established by VIS02–VIS07.

#### From project clarifications, ADRs and the asset pipeline

- **ADR-009 (KB §5):** Angular 22, standalone components, zoneless, lazy-loaded feature routes. The 3D canvas must be encapsulated in a dedicated component whose render loop does **not** drive Angular change detection on every frame.
- **ADR-014 (KB §5):** GLTF 2.0 binary (`.glb`) exclusively. The renderer must use `GLTFLoader`; no OBJ/MTL/FBX.
- **`3d-assets-guide.md` §9:** a single `AssetService` (`providedIn: 'root'`) wraps `GLTFLoader`; the canvas component never sees the loader directly.
- **KB §33.2:** the reference implementation uses `renderer.setAnimationLoop(...)` — not bare `requestAnimationFrame` — as the canonical loop.
- **WEB01 AC6:** the 3D viewer is a feature module under `frontend/src/app/features/kitchen/`, lazy-loaded from the router.
- **WEB06 AC6:** the viewer consumes the **active** configuration via `GET /api/v1/kitchen-configurations?activeOnly=true`; it does not embed a layout in the SPA bundle.
- **Table 1 (Sprint 2 US p. 11–12):** `MANAGER` and `EMPLOYEE` may consult the kitchen viewer. `CUSTOMER` and `Guest` do not. This is a routing + guard concern, not a rendering concern, but the module must be mounted behind `RoleGuard([MANAGER, EMPLOYEE])`.

### 1.3. Acceptance Criteria (expanded, testable)

#### AC1 — Three.js embedded as an SPA component
- AC1.1 The 3D canvas is a **standalone Angular component** (`KitchenViewerComponent`) under `frontend/src/app/features/kitchen/`.
- AC1.2 The component is reachable via a lazy route `path: 'kitchen-viewer'`, `loadComponent: () => import('./kitchen-viewer/kitchen-viewer.component')`, guarded by `RoleGuard([MANAGER, EMPLOYEE])` (WEB03).
- AC1.3 The component hosts a `<canvas>` via `@ViewChild('canvas')`. The renderer's drawing buffer is `canvas.clientWidth × canvas.clientHeight × devicePixelRatio`, capped at `Math.min(window.devicePixelRatio, 2)` (avoids 3× retina blowup on the performance budget).
- AC1.4 The renderer is created in `ngAfterViewInit` and disposed in `ngOnDestroy`. Disposal explicitly calls: `renderer.setAnimationLoop(null)`, `renderer.dispose()`, iterate scene children and call `geometry.dispose()` / `material.dispose()` / `texture.dispose()` for each, and `renderer.forceContextLoss()`.
- AC1.5 The animation loop uses `renderer.setAnimationLoop(...)`, not raw `requestAnimationFrame` — required for WebXR compatibility and aligned with KB §51.6.
- AC1.6 The loop runs **outside** Angular's change detection (`NgZone.runOutsideAngular`) — required by KB §33.3 to avoid per-frame CD churn.

#### AC2 — SPA navigation, layout and authentication preserved
- AC2.1 The shell (header, nav, footer) from WEB02 remains visible; the canvas is rendered inside the content outlet, not overlaid on the shell.
- AC2.2 The `Authorization: Bearer` interceptor (WEB01) remains active: the viewer's `GET /kitchen-configurations` request carries the JWT.
- AC2.3 The route guards of WEB03 are applied — an unauthenticated navigation to `/kitchen-viewer` redirects to `/login?returnUrl=/kitchen-viewer`, and an unauthorized role redirects to `/forbidden`.
- AC2.4 The language toggle (WEB02 AC4) re-renders UI strings inside the viewer (labels, tooltips, error banners) without rebuilding the scene.

#### AC3 — Repository integration
- AC3.1 The module lives in the same `frontend/` workspace; no separate build, no iframe, no WebComponent boundary.
- AC3.2 Three.js is declared as a runtime dependency in `frontend/package.json` (`three` + `@types/three`), not loaded from a CDN.
- AC3.3 The 3D asset tree lives under `frontend/public/assets/3d/` per `3d-assets-guide.md` §3, not under `src/assets/` (avoiding hashed filenames that break the `modelUrl` pattern `^/assets/3d/models/...\.glb$`).
- AC3.4 A build produces a single deployable SPA bundle; `make up` (KB §38) starts the frontend container serving both the SPA and the assets from Nginx.

#### AC4 — Interface contract for feature code
- AC4.1 The module exposes a single injectable `AssetService` for GLB loading and a single `KitchenLayoutService` for fetching + validating the active layout; the component does not call `HttpClient` or `GLTFLoader` directly.
- AC4.2 The component's inputs are the layout `name` (optional — otherwise it fetches the active one) and a `reload()` public method callable from WEB06 after activation (WEB06 AC6.5).
- AC4.3 The component's outputs are `error` (string, i18n key) and `loaded` (boolean), so the shell can surface failures via the WEB04 toast.

#### AC5 — Behaviour when the module cannot be loaded
- AC5.1 If `GET /kitchen-configurations?activeOnly=true` returns `[]` (no active config), the module renders an empty-state message ("Nenhuma configuração de cozinha ativa. Contacte o gestor.") and does not instantiate the renderer. The route remains accessible.
- AC5.2 If the WebGL context cannot be created (`renderer.getContext()` null, or `WebGLRenderingError`), the module shows "O seu navegador não suporta WebGL 2." and does not crash the SPA.
- AC5.3 If an asset fails to load (404, CORS), the error is surfaced per-asset (VIS02 AC5.3) without tearing down other models already in the scene.

### 1.4. Found out Dependencies

**Preceding:**
- WEB01 (Angular workspace + `HttpClient` + interceptors), WEB02 (shell), WEB03 (role guard), WEB04 (error toast).
- AA01/AA02 (JWT availability).
- ADR-009 (Angular), ADR-014 (GLB), ADR-011 (KitchenConfiguration endpoint).
- `frontend/public/assets/3d/models/` populated with at least the 6 GLBs referenced by the reference layout.

**Succeeding:**
- VIS02–VIS07 (all extend the component).
- WEB06 AC6.5 (the "Reload viewer" button calls this component's `reload()`).

### 1.5. Input and Output Data

#### 1.5.1. Component surface

```ts
// kitchen-viewer.component.ts (public surface, illustrative)
@Component({
  selector: 'app-kitchen-viewer',
  standalone: true,
  template: `<canvas #canvas class="kv-canvas"></canvas>
             <div class="kv-overlay" *ngIf="state().kind === 'error'">…</div>`,
})
export class KitchenViewerComponent implements AfterViewInit, OnDestroy {
  @Input() configName?: string;           // optional; otherwise fetch active
  @Output() error = new EventEmitter<string>();
  @Output() loaded = new EventEmitter<boolean>();
  reload(): Promise<void>;                // re-fetches + rebuilds scene
  ngOnDestroy(): void;                    // disposes GPU resources
}
```

#### 1.5.2. Endpoint matrix (consumed by this module)

| Method | Path | Roles | Response |
|---|---|---|---|
| GET | `/api/v1/kitchen-configurations?activeOnly=true` | MANAGER, EMPLOYEE | `200 KitchenConfigurationResponseDTO[]` (0 or 1) |
| GET | `/api/v1/kitchen-configurations/{name}` | MANAGER, EMPLOYEE | `200 KitchenConfigurationResponseDTO` (explicit selection) |
| GET | `/assets/3d/models/*.glb` | (Nginx static) | `200 application/octet-stream` |

#### 1.5.3. Persistence

No new tables. `kitchen_configurations` (migration 014 §3) already exists; `json_content JSONB` is the payload.

#### 1.5.4. Performance budget (inherited from `3d-assets-guide.md` §6; enforced at VIS02–VIS07 verification)

| Dimension | Budget |
|---|---|
| Total GLB payload | ≤ 15 MB |
| Single GLB | ≤ 5 MB |
| Polygons / scene | ≤ 250,000 |
| Draw calls | ≤ 40 |
| Lights that cast shadows | ≤ 1 |
| Shadow map size | ≤ 1024 × 1024 |
| Texture resolution (per map) | ≤ 2048 × 2048 |
| First-paint of scene | ≤ 3 s |

### 1.6. System Sequence Diagrams (SSD)

#### 1.6.1. Lazy load and mount

```mermaid
sequenceDiagram
autonumber
title VIS01 - Lazy load and mount
    actor User as Manager / Employee
    participant Router as Angular Router
    participant Guard as RoleGuard
    participant Cmp as KitchenViewerComponent
    participant Ng as NgZone
    participant Renderer as THREE.WebGLRenderer
    participant Canvas as HTMLCanvasElement

    User->>Router: navigate /kitchen-viewer
    Router->>Guard: canActivate(['MANAGER','EMPLOYEE'])
    alt not allowed
        Guard-->>Router: redirect /forbidden
    else allowed
        Guard-->>Router: true
        Router->>Cmp: lazy import + instantiate
        Cmp->>Cmp: ngAfterViewInit
        Ng->>Ng: runOutsideAngular(() => { init(); loop(); })
        Cmp->>Canvas: @ViewChild('canvas')
        Cmp->>Renderer: new WebGLRenderer({ canvas, antialias: true })
        alt WebGL 2 unavailable
            Renderer-->>Cmp: null context
            Cmp-->>User: "O seu navegador não suporta WebGL 2."
        else OK
            Renderer->>Renderer: setPixelRatio(min(dpr, 2))
            Renderer->>Renderer: setSize(clientWidth, clientHeight)
            Cmp->>Renderer: setAnimationLoop(renderFn)
            Cmp-->>User: canvas visible; scene load proceeds (VIS02)
        end
    end
```

#### 1.6.2. Dispose on navigation away

```mermaid
sequenceDiagram
autonumber
title VIS01 - Dispose on route change
    participant Router as Angular Router
    participant Cmp as KitchenViewerComponent
    participant Renderer as WebGLRenderer
    participant Scene as THREE.Scene
    participant GPU as GPU context

    Router->>Cmp: navigate away (ngOnDestroy)
    Cmp->>Renderer: setAnimationLoop(null)
    Cmp->>Scene: traverse(child => geometry.dispose(); material.dispose(); material.map?.dispose(); …)
    Cmp->>Renderer: dispose()
    Cmp->>Renderer: forceContextLoss()
    Renderer->>GPU: release buffers / textures
    Cmp-->>Router: destroyed
```

### 1.7. Other Relevant Remarks

#### 1.7.1. Component architecture

```mermaid
classDiagram
    class KitchenViewerComponent {
        +configName?
        +reload()
        +ngAfterViewInit()
        +ngOnDestroy()
    }
    class AssetService {
        +load(url): Promise~GLTF~
    }
    class KitchenLayoutService {
        +getActive(): Observable~KitchenLayout~
        +getByName(name): Observable~KitchenLayout~
        +validate(raw): Result
    }
    class SceneBuilder {
        +build(layout): THREE.Scene
        +dispose()
    }
    class LightBuilder {
        +build(lights): {lights, controlsModel}
    }
    class CameraController {
        +attach(renderer, scene, camera, bounds)
        +dispose()
    }
    class UiOverlay {
        +showError(key)
        +showEmpty()
    }

    KitchenViewerComponent --> AssetService
    KitchenViewerComponent --> KitchenLayoutService
    KitchenViewerComponent --> SceneBuilder
    KitchenViewerComponent --> LightBuilder
    KitchenViewerComponent --> CameraController
    KitchenViewerComponent --> UiOverlay
```

#### 1.7.2. Error-to-HTTP/UX matrix

| Condition | HTTP | UI |
|---|---|---|
| No active configuration | 200 `[]` | empty-state overlay, no renderer init |
| Active configuration fetched | 200 `[{isActive:true}]` | normal render |
| 401 | 401 | redirect `/login?returnUrl=/kitchen-viewer` (WEB04 interceptor) |
| 403 | 403 | redirect `/forbidden` |
| 503 (backend unavailable) | 503 | toast + retry affordance (WEB04 AC7) |
| WebGL2 unsupported | n/a | in-module fallback message |
| Asset 404 (one model) | 404 on GLB | inline warning per-mesh, other meshes render (VIS02 AC5.3) |

#### 1.7.3. Verification

- **Unit:** `SceneBuilder.dispose` calls `dispose()` on every geometry/material/texture (mocked THREE objects); `KitchenViewerComponent` does not import `GLTFLoader` or `HttpClient` (lint rule).
- **Integration (Angular TestBed):** lazy route resolves; `RoleGuard` blocks CUSTOMER; `reload()` triggers a new `GET /kitchen-configurations?activeOnly=true`.
- **Performance:** Lighthouse / Chrome DevTools shows first paint of the canvas ≤ 3 s with the reference layout; `renderer.info.render.calls ≤ 40`, `triangles ≤ 250,000` (asserted in a dev-only performance spec).
- **Demo:** navigate to `/kitchen-viewer` as EMPLOYEE, observe scene; as MANAGER from WEB06 with "Reload viewer"; as CUSTOMER → `/forbidden`.