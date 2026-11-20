
# WEB06 – VIS01 Integration Contract

Version: 1.0
Project: LaPrizza
Sprint: 2

## 1. Purpose

This document defines the communication contract between
the Kitchen Configuration module (WEB06) and the 3D
Visualization module (VIS01).

WEB06 is responsible for managing, validating and
persisting kitchen configurations.

VIS01 is responsible for rendering the kitchen using
Three.js, based on the active configuration provided
by the backend.

The backend is the single source of truth.

## 2. Active Configuration Endpoint

Method: GET

Endpoint:
`/api/kitchen-configurations/active`

Authentication:
Requires an authenticated and active system user.

The endpoint returns the currently active kitchen
configuration.

## 3. Successful Response

HTTP Status: 200 OK

Example:

```json
{
  "name": "Main Kitchen",
  "jsonContent": {
    "schemaVersion": "1.0",
    "dimensions": {
      "x": 12,
      "y": 4,
      "z": 10
    },
    "equipment": [
      {
        "id": "main-oven",
        "label": "Main Oven",
        "category": "oven",
        "modelUrl": "/assets/3d/models/oven.glb",
        "position": [2, 0, 3],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      }
    ],
    "lights": [
      {
        "type": "ambient",
        "color": "#ffffff",
        "intensity": 1
      }
    ],
    "animationTriggers": []
  },
  "isActive": true,
  "createdAt": "2026-11-11T10:00:00.000Z",
  "updatedAt": "2026-11-11T10:00:00.000Z"
}
```

The example is illustrative. The actual response is
generated from the active database record.

## 4. Response Fields

| Field | Type | Description |
|---|---|---|
| name | string | Configuration name |
| jsonContent | object | Kitchen layout |
| isActive | boolean | Active status |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

## 5. Kitchen Layout Structure

The jsonContent object contains:

- schemaVersion: configuration schema version.
- dimensions: kitchen dimensions in metres.
- equipment: equipment and assembly-line objects.
- lights: scene lighting configuration.
- animationTriggers: future animation definitions.

## 6. Equipment Structure

Each equipment item contains:

- id: unique equipment identifier.
- label: optional display name.
- category: equipment category.
- modelUrl: URL of the GLB model.
- position: [x, y, z], in metres.
- rotation: [x, y, z], in radians.
- scale: [x, y, z], positive scale factors.

The equipment id must be unique within the configuration.

## 7. Asset Loading

Models are served by the frontend static asset server.

Example:

`/assets/3d/models/oven.glb`

The viewer must resolve modelUrl against the SPA origin.

Example:

```typescript
const modelUrl = new URL(
  equipment.modelUrl,
  window.location.origin
).toString();
```

Models must use the GLB format.

## 8. Configuration Reload

WEB06 uses the BroadcastChannel:

`laprizza-kitchen-viewer`

After activating a configuration, WEB06 may publish:

```json
{
  "type": "KITCHEN_CONFIGURATION_RELOAD",
  "configurationName": "Main Kitchen",
  "requestedAt": "2026-11-11T10:00:00.000Z"
}
```

VIS01 may listen to this channel.

When this message is received, VIS01 must request
the active configuration again from the backend.

The message is only a notification.
It must not be treated as the configuration itself.

## 9. Initial Viewer Loading

When the Kitchen Viewer is initialized, VIS01 must
always request:

`GET /api/kitchen-configurations/active`

The viewer must not depend exclusively on BroadcastChannel,
because it may be opened after the activation notification.

## 10. Error Handling

| HTTP Status | Meaning | Expected behaviour |
|---|---|---|
| 401 | Authentication required | Request authentication |
| 403 | Access forbidden | Display access error |
| 404 | No active configuration | Display an empty state |
| 422 | Invalid configuration or missing asset | Do not render invalid configuration |
| 503 | Asset server unavailable | Show an error and allow retry |

The viewer must preserve the last successfully loaded
scene when a new configuration cannot be loaded.

## 11. Responsibilities

### WEB06

- Manage kitchen configurations.
- Validate JSON content.
- Validate model references.
- Maintain the active configuration.
- Expose the REST API.
- Notify the viewer when a configuration changes.

### VIS01

- Retrieve the active configuration.
- Load GLB assets.
- Render the kitchen using Three.js.
- Apply position, rotation and scale.
- Apply configured dimensions and lighting.
- Handle loading and rendering errors.

## 12. Source of Truth

The backend database is the authoritative source.

The viewer must always retrieve the active configuration
from the backend.

BroadcastChannel is an optional reload notification
mechanism and is not a replacement for the REST API.
