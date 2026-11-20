# SYS04 — Shared Resource Folder

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST
**Requirement:** SYS04 — Configure and document a shared resource folder
**Version:** 1.0 (Sprint 2 baseline)
**Related artefacts:** `sys-backup-strategy.md` (SYS08), `sys-network-config.md` (SYS02/SYS03/SYS05), `sys-deployment.md` (SYS01), ADR-011, ADR-014

---

## 1. Purpose and scope

SYS04 requires the deployment to include **a shared resource folder** — a
single filesystem location, mounted into multiple containers, where artefacts
consumed by more than one service are stored. This document defines:

1. What the shared folder is (and what it is **not**).
2. Its directory structure.
3. The permission model.
4. Which services mount it and with what access mode.
5. Retention rules per subfolder.
6. The relationship with backups (SYS08).
7. The GDPR implications.

Out of scope: user home directories (covered in ASIST §27), Samba/NFS export
to hosts outside the Docker network (`sys-network-config.md §4` restricts
egress), and any customer personal data.

---

## 2. Distinction from backups

The shared folder is **not** a backup. It is explicitly distinct from
`sys-backup-strategy.md` (SYS08) in four dimensions:

| Dimension | Shared folder | Backups |
|---|---|---|
| Purpose | Runtime artefact exchange between containers | Disaster recovery + restore |
| Content | Data that a service *needs* to run | A copy of business state |
| Lifecycle | Overwritten on each deployment | Retained according to 7/4/12 policy |
| Retention | 7 days (exports) / persistent (3D assets) | 7 daily + 4 weekly + 12 monthly |
| Encryption | Filesystem-level (host) | `age`-encrypted archive (§5 of SYS08) |

An artefact may exist in **both** places (e.g., the 3D GLB models are in the
shared folder *and* in the backup), but the semantics differ: the shared
folder is what the renderer fetches; the backup is what proves the renderer
can be restored.

---

## 3. Physical definition (Docker volume)

The shared folder is a **named Docker volume** attached to every service that
needs it:

```yaml
volumes:
  laprizza-shared:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/laprizza/shared
```

`device` is a host path chosen so that the ASIST owner can inspect files
outside Docker if necessary (e.g., during a restore). The path is **outside**
`/var/lib/docker` so that `docker system prune -a` does not destroy it.

Mount declaration per service (KB §36):

```yaml
services:
  backend:
    volumes:
      - laprizza-shared:/shared
  prolog:
    volumes:
      - laprizza-shared:/shared:ro
  frontend:
    volumes:
      - laprizza-shared:/shared:ro
```

`backend` reads and writes; `prolog` and `frontend` are read-only, per §5.

The `documents/` subtree is served only by the authenticated backend endpoint
`/api/v1/documents/{path}`. Any active authenticated user may read; only a
`MANAGER` may write or delete. Direct public Nginx file serving is not enabled.
Every endpoint access is appended to `/shared/logs/shared-access/YYYYMMDD.log`.

---

## 4. Directory structure

```
/shared/
├── 3d-assets/             # GLB models, textures, environment maps (ADR-014)
│   ├── models/
│   ├── textures/
│   └── env/
├── kitchen-schemas/       # kitchen-schema.json (schemaVersion files)
├── documents/              # authenticated operational documents and reports
│   ├── reports/
│   └── operations/
├── planning-inputs/       # per-execution JSON payloads sent to Prolog (ADR-012)
├── planning-outputs/      # raw JSON responses from the Prolog engine
├── exports/               # product catalogue exports (AI06)
├── tmp/                   # short-lived scratch space (sticky, world-writable)
└── README.md              # this section, symlinked from the deployment doc
```

### 4.1. Subfolder semantics

| Subfolder | Writer | Reader(s) | Purpose | Retention |
|---|---|---|---|---|
| `3d-assets/models/` | SGRAI owner | `frontend` | GLB models referenced by `modelUrl` in the kitchen layout | Persistent (versioned with git) |
| `3d-assets/textures/` | SGRAI owner | `frontend` | PBR texture sets (`map`, `normalMap`, `roughnessMap`) | Persistent |
| `3d-assets/env/` | SGRAI owner | `frontend` | Environment maps (`CubeTextureLoader` files) | Persistent |
| `kitchen-schemas/` | Backend owner | `backend`, `frontend` | JSON Schema files (versioned) validated at the boundary | Persistent |
| `planning-inputs/` | `backend` | `prolog` | Per-execution payload sent to the Prolog engine | 7 days |
| `planning-outputs/` | `prolog` | `backend` (on response — file is a backup to HTTP) | Raw responses for audit | 7 days |
| `exports/` | `backend` | external consumers via `GET /products/export` | Product catalogue snapshots for AI06 | 30 days |
| `tmp/` | any container | any container | Scratch space | Purged at every container restart |
| `documents/reports/` | `MANAGER` through API | authenticated users | Project reports | Persistent |
| `documents/operations/` | `MANAGER` through API | authenticated users | Operational documents | Persistent |

### 4.2. Referential integrity

The `3d-assets/models/` directory is the **authoritative source** for the
`modelUrl` field in the kitchen JSON (§1 of this document). Two invariants
apply:

1. **Every `modelUrl` in a persisted `KitchenConfiguration` must resolve** to
   a file under `/shared/3d-assets/models/`. This is validated by
   `KitchenConfigValidationService` (ADR-011 §"Consequences — Negative") at
   save time, and it is what distinguishes a `422 Unprocessable Entity` (bad
   JSON) from a successful save that would later 404 in the renderer.
2. **The inverse is not required.** A file may exist in
   `3d-assets/models/` that is not referenced by any configuration (e.g., a
   candidate model awaiting approval). This is intentional; it lets the SGRAI
   team version assets ahead of layout changes.

The same files are also served by the `frontend` container via Nginx
(`/assets/3d/models/...`). The shared folder is mounted **read-only** to the
frontend so the browser download path and the file-on-disk path are the same
bytes.

---

## 5. Ownership and permission model

The shared folder follows the POSIX rules of ASIST §27.3. Owner and group are
assigned to a dedicated system user/group so that no container runs as root.

| Container | UNIX uid | UNIX gid | Mount mode | Read | Write |
|---|---|---|---|---|---|
| `backend` | 1000 | 1000 | `rw` | all | `planning-inputs/`, `planning-outputs/` (write), `exports/` (write) |
| `prolog` | 1000 | 1000 | `ro` | all | none |
| `frontend` | 101 | 101 (nginx) | `ro` | `3d-assets/`, `kitchen-schemas/` | none |

### 5.1. POSIX modes

| Path | Owner | Mode | Rationale |
|---|---|---|---|
| `/shared/` | `laprizza:laprizza` | `0750` | Not world-readable; group has full access |
| `/shared/3d-assets/` and below | `laprizza:laprizza` | `0755` | Served by Nginx (user `nginx`, uid 101); needs `+rx` for others |
| `/shared/kitchen-schemas/` | `laprizza:laprizza` | `0755` | Same as above |
| `/shared/planning-inputs/` | `laprizza:laprizza` | `0750` | Not served; contains transient state |
| `/shared/planning-outputs/` | `laprizza:laprizza` | `0750` | Same |
| `/shared/exports/` | `laprizza:laprizza` | `0755` | Served by `GET /products/export` if the backend elects to stream |
| `/shared/tmp/` | `root:root` | `1777` | Sticky bit (ASIST §27.3): only the creator can delete; world-readable + world-writable for scratch files |

### 5.2. Extended ACLs

For the SGRAI team to author assets without container rebuilds, an **extended
ACL** grants `rwx` to a named group without changing the base owner:

```bash
sudo setfacl -R -m g:sgri:rwX /shared/3d-assets
sudo setfacl -R -d -m g:sgri:rwX /shared/3d-assets   # default ACL for new files
```

Only the SGRAI team is in `g:sgri`. This is documented and audited by the ASIST
owner (§6 of `sys-network-config.md`).

---

## 6. Retention policy

Retention is **per subfolder**, enforced by a cron job on the host (not inside
containers, so the policy is auditable and survives container restarts).

```bash
# /etc/cron.d/laprizza-shared-cleanup
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
0 3 * * *   root  find /var/lib/laprizza/shared/planning-inputs  -type f -mtime +7  -delete
0 3 * * *   root  find /var/lib/laprizza/shared/planning-outputs -type f -mtime +7  -delete
0 3 * * *   root  find /var/lib/laprizza/shared/exports          -type f -mtime +30 -delete
0 3 * * *   root  find /var/lib/laprizza/shared/tmp              -type f -mtime +1  -delete
```

`3d-assets/` and `kitchen-schemas/` are **excluded** — they are versioned
artefacts, not transient state. Deleting an unused model is a deliberate,
documented operation, not a cron task.

The retention values align with SYS08 (§3.1) and with the GDPR storage
limitation principle (§D.4.5). Files older than the retention window are
considered no longer needed for operational purposes; the deletion is logged
via `syslog` (§36.4 of the KB Master).

---

## 7. Relationship with backups (SYS08)

`backup.sh` (SYS08 §5.1) does **not** archive `/shared/` by default. The
reasoning:

- `3d-assets/` and `kitchen-schemas/` are already in git and in Docker images.
- `planning-inputs/` and `planning-outputs/` are transient by design (7 days).
- `exports/` is reproducible from the database.
- `tmp/` is by definition ephemeral.

For audit, an **opt-in** `BACKUP_SHARED=true` variant exists (documented in
`sys-backup-strategy.md` §3.3). When enabled, `tar czf | age` archives
`/shared/3d-assets/` and `/shared/kitchen-schemas/` — the two folders that
matter for recovery, because if the host is lost, the assistant needs those
bytes to bring a new host up without a git pull.

---

## 8. GDPR considerations

The shared folder **contains no personal data**. Confirmations:

- No user, customer, or dietary files.
- No logs (logs go to stdout, journald, or the log server per §36 of the KB
  Master — outside `/shared`).
- No exports that contain PII. `GET /products/export` (AI06) exports only the
  product/BOM catalogue, which is not PII (Appendix D §D.6: "Simulated/Planning
  — N/A (Anonymized)").

The `sys-risk-assessment.md` R-06 (GDPR breach) mitigation explicitly asserts
that "AI snapshots contain no customer PII". The shared folder does not
weaken that assertion.

---

## 9. Verification checklist

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Volume exists | `docker volume inspect laprizza-shared` | `Mountpoint: /var/lib/laprizza/shared` |
| 2 | Mounted in backend | `docker exec laprizza_backend ls /shared` | 4+ subfolders |
| 3 | Mounted read-only in prolog | `docker exec laprizza_prolog ls /shared` | same, and `touch /shared/x` fails |
| 4 | Mounted read-only in frontend | `docker exec laprizza_frontend ls /shared` | same, and `touch /shared/x` fails |
| 5 | POSIX modes | `find /var/lib/laprizza/shared -maxdepth 2 -type d -printf '%m %p\n'` | matches §5.1 |
| 6 | Sticky bit on tmp | `stat -c '%a' /var/lib/laprizza/shared/tmp` | `1777` |
| 7 | Cron cleanup | `crontab -l \| grep laprizza-shared-cleanup` | 4 lines |
| 8 | Retention run | `find /var/lib/laprizza/shared/planning-inputs -mtime +7` | empty |

---

## 10. References

- LaPrizza KB v2.0 §36 (Compose), §D.6 (GDPR inventory), §D.10 (retention).
- ADR-011 (opaque JSONB — layout references); ADR-014 (GLB pipeline — where the bytes live).
- `sys-backup-strategy.md`, `sys-network-config.md`, `sys-deployment.md`, `sys-mbco.md`.
- ASIST course, §27 (POSIX permissions, sticky bit, ACLs).