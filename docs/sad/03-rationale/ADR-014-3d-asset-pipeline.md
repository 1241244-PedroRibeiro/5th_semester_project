# ADR 014: 3D Asset Pipeline & Schema

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team

## Context
Sprint 2 introduces the **3D Kitchen Visualization (VIS01-VIS07)** mandatory requirement. The system must render a 3D scene containing a conveyor belt, a wood-fired oven, robotic arms, and various kitchen equipment, integrated into the Angular SPA using Three.js.

User Story **VIS02** states that the 3D module must retrieve kitchen dimensions, equipment positions, and asset URLs from the backend. User Story **VIS04** mandates the use of textures and materials (color maps, roughness, normal maps). 

The challenge is threefold: 
1. Establishing a standardized file format for the 3D models (to ensure performance and compatibility).
2. Defining a strict JSON schema to bridge the backend `KitchenConfiguration` (ADR-011) and the frontend Three.js renderer.
3. Ensuring the solution is prepared for the Sprint 3 requirement of **animating** the assembly line (dispensers, conveyors, robotic arms).

## Decision
We adopt **GLTF 2.0 (GLB format)** as the exclusive standard for 3D assets, combined with a strictly defined JSON Schema for the Kitchen Configuration payload.

1. **GLB Format:** All 3D models (oven, robotic arms, conveyor) must be stored as `.glb` (binary GLTF) files. This encapsulates geometry, materials, textures, and skeletal animations into a single, highly compressed file. 
2. **Asset Hosting:** Assets are served as static files from the backend (or an Nginx static volume), and their URLs are referenced in the configuration JSON.
3. **JSON Schema Definition:** The `json_content` column defined in ADR-011 must adhere to a predefined, documented schema containing:
   - `dimensions`: `{ x: number, y: number, z: number }`
   - `equipment`: An array of objects, each containing `id` (unique string), `modelUrl` (path to the GLB), `position` (x,y,z), `rotation` (x,y,z), and `scale` (x,y,z).
   - `lights`: An array defining position, type (ambient/spot/directional), color, and intensity.
   - `animationTriggers` (for Sprint 3 readiness): Placeholder definitions for how items flow along the conveyor.
4. **Validation:** The `KitchenConfigurationValidator` (Application Service) validates the JSON payload against this schema before saving. The primary key of the `KitchenConfiguration` is its business `name` (e.g., "Summer Layout"), not a UUID.

## Alternatives Considered

### 1. OBJ / MTL Format
- *Description:* The traditional format often taught in introductory graphics courses.
- *Pros:* Simple text-based format, widely supported.
- *Cons:* Rejected. OBJ/MTL requires multiple separate files (one for geometry, one for material, and loose image files for textures). This creates CORS issues, complex path resolution in the browser, and makes it very difficult to manage skeletal animations required for Sprint 3.

### 2. Procedural Geometry (Three.js Native Shapes)
- *Description:* Generating the ovens and robotic arms entirely via code (e.g., `BoxGeometry`, `CylinderGeometry`) in the frontend.
- *Pros:* No external assets needed, zero loading time, complete control over vertices.
- *Cons:* Rejected. While viable for simple boxes, it is impossible to achieve the realism required for the wood-fired oven textures, robotic arms, and articulated joints without thousands of lines of complex geometry code. Furthermore, animating procedural joints is significantly harder than playing a GLTF animation track.

### 3. FBX or STL Formats
- *Description:* Other common 3D formats.
- *Pros:* Common in the industry.
- *Cons:* Rejected. FBX is a proprietary Autodesk format and the Three.js loader is somewhat outdated and unreliable. STL only supports geometry (no textures or colors), which directly violates VIS04.

## Consequences

### Positive
- **Performance:** `.glb` files are binary, highly compressed, and optimized for web transmission. Three.js's `GLTFLoader` is highly optimized.
- **Sprint 3 Ready:** GLTF natively supports animations (keyframes, skeletal rigs). When the time comes to animate the robotic arms, the team only needs to trigger the animation mixers in Three.js; no backend schema changes or new asset loading logic will be required.
- **Encapsulation:** Everything the renderer needs (mesh, textures, materials) is in one file. 
- **Contractual Clarity:** The JSON schema acts as a strict contract between the backend developers and the SGRAI (3D) team, preventing miscommunication.

### Negative / Trade-offs
- **Skill Requirement:** The SGRAI team must know how to export GLTF/GLB correctly from Blender (ensuring textures are embedded and scales are applied).
- **Validation Complexity:** The backend must implement a robust JSON validator (using a schema library) to ensure Managers cannot upload configurations that reference non-existent GLB files or have invalid coordinates, which would crash the 3D viewer.