# Roadmap

Backlog of features for the CNPG Headlamp plugin, numbered in the order they were captured (not priority). See "Suggested implementation order" below for sequencing.

## Suggested implementation order

Ordered by dependencies first, then easy-and-high-value before harder/riskier or externally-dependent work.

1. **#1 Cluster list with health indicator** — foundational; almost every other item assumes a cluster list/detail view exists to attach to.
2. **#2 Instance roles and sync replication warning** — cheap extension of #1, just reading more `status` fields onto the same view.
3. **#11 Instance/Postgres log access** — likely reuses Headlamp's existing pod-logs viewer; high debugging value for cheap effort, and depends only on #1/#2 for pod selection.
4. **#10 Storage (PVC) visibility and full-disk warnings** — directly extends the health indicator's root-cause story from #1; effort depends on which data source we settle on (PVC objects alone vs. Prometheus/exec).
5. **#9 Pooler (PgBouncer) visibility** — same CRD-listing pattern as #1, applied to a second resource type; mostly independent.
6. **#4 On-demand backups and backup list with status** — moderate effort (create a `Backup` CR, list `status`), doesn't require the Barman Cloud plugin to already be scoped out.
7. **#5 Graphical scheduled backup configuration** — builds directly on #4's method/target sub-form.
8. **#12 Edit PostgreSQL configuration** — independent of the backup work; moderate effort, moderate value.
9. **#3 psql session against primary or a replica** — depends on #2's role picker; higher effort due to exec/terminal integration and the security/RBAC considerations.
10. **#6 Basic monitoring via Prometheus metrics** — optional external dependency (Prometheus must be present) and its own charting integration; higher effort for the payoff versus #10/#11.
11. **#7 Multi-step cluster creation wizard** — highest-effort form work, and deliberately reuses the sync-replication (#2) and backup (#4/#5) sub-forms, so should come after those exist.
12. **#8 Bootstrap a cluster from a backup (recovery)** — depends on #7's wizard scaffolding *and* an external Barman Cloud plugin dependency; most moving pieces, so last.

## 1. Cluster list with health indicator

List all CloudNativePG `Cluster` resources (across namespaces) with a traffic-light health indicator per cluster.

Health logic (as specified):
- **Green** — cluster phase is healthy, WAL archiving is working, and backups are running fine.
- **Yellow** — cluster phase is healthy, but WAL archiving and/or backups are not confirmed healthy.
- **Red** — cluster phase itself is not healthy (something is failing).

Open questions to resolve during implementation:
- Exact CNPG CRD fields to read this from — likely `status.phase` for cluster health, `status.conditions` (a `ContinuousArchiving` condition) for WAL archiving, and `status.lastSuccessfulBackup` / `status.firstRecoverabilityPoint` (or the `Backup` CRD list) for backup health. Needs verification against the CNPG API version in use.
- Whether "backups running fine" requires a `ScheduledBackup`/`Backup` resource to exist at all, or is only evaluated when one is configured (a cluster with no backup configured shouldn't necessarily be red/yellow for that alone).
- Multi-namespace / multi-cluster (Headlamp cluster, not CNPG Cluster) listing behavior.

## 2. Instance roles and synchronous replication warning

In the cluster list/detail, show which instance is currently primary, and surface a warning when a cluster has multiple instances but no synchronous replication configured (i.e. running async-only, which risks data loss on failover).

Open questions to resolve during implementation:
- Primary instance is available via `status.currentPrimary` (and `status.targetPrimary` during a switchover) — need to confirm which one to surface as "primary" and whether to flag a mismatch between the two (in-progress switchover).
- Synchronous replication is configured via `spec.postgresql.synchronous` (newer CNPG versions) or the legacy `spec.minSyncReplicas`/`spec.maxSyncReplicas` — need to check which API version(s) this plugin should support and read from the right field.
- Whether the warning should apply to any multi-instance cluster with zero sync replicas, or only ones where the user seems to expect HA (e.g. `instances > 1` is probably a good enough signal on its own).
- Where this surfaces: inline in the cluster list row, or only in the cluster detail view (list row is likely too cramped for both the health dot and this warning, given #1).

## 3. Launch a psql session against primary or a replica

From the cluster detail view, let the user open an interactive `psql` session against the primary instance, or pick a specific replica.

Open questions to resolve during implementation:
- Likely built on Headlamp's existing pod exec/terminal support (same mechanism as "exec into pod" in core Headlamp) rather than a bespoke terminal — need to confirm what that API looks like and whether it's usable from a plugin.
- Instance pods are selected by role via the `cnpg.io/instanceRole` (or similar) pod label — need to confirm exact label name/value for primary vs replica to build the picker.
- Credentials: CNPG stores superuser/app credentials in a Secret (`<cluster>-superuser`, `<cluster>-app`); need to decide which role to connect as by default, and whether the user can choose.
- Security/authorization: this effectively grants shell-level DB access from the UI — should probably be gated behind whatever RBAC the user already has on `pods/exec` in that namespace (Kubernetes will enforce it, but worth confirming Headlamp surfaces a clear permission error rather than failing silently).

## 4. On-demand backups and backup list with status

Let users trigger an on-demand backup for a cluster, and list existing `Backup` resources with their status.

Open questions to resolve during implementation:
- Triggering a backup means creating a `Backup` CR (referencing the target `Cluster`) — need to confirm whether to expose backup method/target options (e.g. `spec.method`: `barmanObjectStore` vs `volumeSnapshot`, `spec.target`: `primary`/`prefer-standby`) or just use the cluster's configured defaults.
- Creating this CR requires `create` RBAC on `backups.postgresql.cnpg.io` in the namespace — same "let Kubernetes enforce it, surface a clear error" approach as #3.
- Backup list status comes from `status.phase` (`pending`/`running`/`completed`/`failed`) plus `status.startedAt`/`stoppedAt`/`error` — should this list be scoped per-cluster (shown in cluster detail) or also available as its own top-level view across clusters?
- Should `ScheduledBackup` resources (recurring backup schedules) be shown/managed here too, or is that a separate roadmap item?

## 5. Graphical scheduled backup configuration

Let users create/edit `ScheduledBackup` resources through a form (day/time/frequency pickers) instead of hand-writing the cron expression in `spec.schedule`.

Open questions to resolve during implementation:
- CNPG's `spec.schedule` is a 6-field cron (with seconds) rather than standard 5-field cron — the form needs to build/parse that format correctly, and probably show the generated expression alongside the picker for transparency/trust.
- Should the form only support common patterns (daily/weekly/monthly at a given time) with an "advanced: raw cron" escape hatch, or try to fully round-trip arbitrary cron expressions back into picker state?
- Same `spec.method`/`spec.target` options as on-demand backups (#4) apply here — likely want to share that sub-form between the two features.
- Also covers `spec.suspend` (pause a schedule without deleting it) and `spec.immediate` (run once at creation) — worth exposing as simple toggles.
- List view: show existing `ScheduledBackup`s per cluster with next-run time (derived from the cron expression) and last outcome, alongside or near the backup list from #4.

## 6. Basic monitoring via Prometheus metrics

Add charts (replication lag, WAL archiving status, connection counts, etc.) to the cluster/instance detail views, sourced from Prometheus.

Open questions to resolve during implementation:
- Follow the pattern from the official `prometheus` plugin (`official-plugins/prometheus/src/request.tsx` and `official-plugins/prometheus/src/components/Chart/`) for querying Prometheus and rendering charts, rather than building a new charting approach.
- CNPG's instance manager exposes its own Prometheus metrics endpoint — need to enumerate which `cnpg_*` metrics are most useful here (replication lag, WAL archiving status/failures, connection counts) and confirm exact metric names against the CNPG version in use.
- Must degrade gracefully when no Prometheus is deployed/scraping CNPG targets in the cluster — detect availability and hide/disable charts rather than erroring, since this is an optional dependency, not a hard requirement.
- Decide whether this reuses the official `prometheus` plugin's request/data-fetching module directly (as a dependency) or just copies the pattern to keep this plugin self-contained.

## 7. Multi-step cluster creation wizard

A step-by-step guided form for creating a new CNPG `Cluster`, instead of requiring users to hand-write the YAML.

Open questions to resolve during implementation:
- Scope deliberately to the common path (name/namespace, instance count, storage size/class, bootstrap method, basic resource requests/limits, optional backup config) rather than trying to cover every `spec` field — include a raw-YAML/advanced escape hatch for anything not covered, same approach as the scheduled-backup form (#5).
- Bootstrap method (`initdb` vs `recovery` vs `pg_basebackup`) meaningfully changes which subsequent steps/fields are relevant — the wizard's step flow needs to branch on this early choice.
- Should reuse the sync-replication awareness from #2 (e.g. nudge/default toward sync replication when instance count > 1) and the backup sub-form from #4/#5 for the optional backup step, rather than duplicating that logic.
- Decide whether the wizard only creates the `Cluster`, or can also create referenced objects it depends on (e.g. a storage class check, a backup object store `Secret`) inline when missing.

## 8. Bootstrap a cluster from a backup (recovery)

A guided flow for creating a new `Cluster` via `bootstrap.recovery`, restoring from an existing backup — distinct from the from-scratch flow in #7 since recovery parameters (source, recovery target) differ substantially.

Decisions already made:
- Target the Barman Cloud **plugin** integration (`ObjectStore` CR + CNPG plugin interface), not the deprecated in-tree `barmanObjectStore` recovery path — CNPG is moving away from in-tree Barman, so building against the plugin path avoids near-term rework.

Open questions to resolve during implementation:
- Recovery source can be an existing in-cluster `Backup` object or a `ObjectStore` reference (recovering into a *new* cluster from another cluster's backups, including cross-cluster/disaster-recovery scenarios) — need to support both entry points, not just "restore this cluster's own last backup."
- Recovery target options (`targetTime`, `targetLSN`, `targetName`, `targetImmediate`, i.e. point-in-time recovery) need their own step with clear defaults (likely "latest" by default, PITR as an advanced option).
- Depends on the Barman Cloud plugin actually being installed in the target Kubernetes cluster — needs the same graceful-degradation treatment as Prometheus in #6 (detect it, guide the user to install it if missing, rather than assuming it's there).
- Should share the instance-count/storage/resource-limit steps with the from-scratch wizard (#7) where they overlap, rather than duplicating that UI.

## 9. Pooler (PgBouncer) visibility and management

Surface CNPG `Pooler` resources (PgBouncer connection poolers attached to a cluster) — list them, show their status, and relate them to their owning `Cluster`.

Open questions to resolve during implementation:
- A `Pooler`'s health is effectively an extension of its cluster's health — decide whether/how it factors into the cluster health indicator from #1, or is shown as a separate but adjacent status.
- Surface key `spec` settings at a glance (pooling mode `session`/`transaction`/`statement`, instance count, target `type`: `rw`/`ro`) and `status` (instance readiness) similar to how #2 shows primary/replica roles.
- Decide whether creating/editing Poolers is in scope here too, or just visibility for now (creation could be a later, separate item).

## 10. Storage (PVC) visibility and full-disk warnings

Surface per-instance PVC usage (capacity vs. used) in the cluster/instance detail view, with a warning when storage is running low or full.

Open questions to resolve during implementation:
- This is one of the more common real-world causes of a cluster going unhealthy (WAL archiving stalls, cluster degrades) — should tie directly into the health indicator's root-cause story from #1, e.g. surfacing "storage almost full" as the likely explanation when phase/WAL archiving turns red/yellow.
- PVC capacity/usage isn't available from the `Cluster` CR itself — likely needs `kubectl` PVC objects for capacity plus either Prometheus node/kubelet volume metrics (ties into #6) or `df`-via-exec for actual used space; need to decide which source to rely on and what to do when neither is available.
- CNPG supports separate WAL and tablespace PVCs per instance (not just the main data volume) — need to show all relevant volumes per instance, not just the primary data PVC.
- Threshold for "running low" (e.g. percentage-based warning) should probably be configurable rather than hardcoded.

## 11. Instance/Postgres log access

Surface Postgres/CNPG instance logs in the plugin (viewing and basic filtering), rather than requiring users to go find them via `kubectl logs` or the cluster logging stack.

Open questions to resolve during implementation:
- CNPG instances log structured JSON to stdout (captured by the container runtime) — likely reusable via Headlamp's existing pod-logs viewer (same mechanism as core Headlamp's "View logs" on a pod) rather than building a bespoke log viewer; need to confirm what's reusable from a plugin.
- Decide whether to parse/pretty-print the structured JSON log lines (e.g. surface log level, message, error fields distinctly) or just show raw log output.
- Filtering: at minimum by instance/pod (primary vs. specific replica, tying into the role picker from #2 and #3), ideally also by log level or a text search.
- Likely the first thing a user reaches for when the health indicator (#1) goes yellow/red — worth linking directly from there once both exist.

## 12. Edit PostgreSQL configuration

Let users view/edit Postgres configuration parameters (`spec.postgresql.parameters`) through the plugin; CNPG handles applying the change (reload or, when required, a rolling restart) on its own.

Open questions to resolve during implementation:
- Editing means patching `spec.postgresql.parameters` on the `Cluster` — need `update`/`patch` RBAC on the `Cluster`, same "let Kubernetes enforce it, surface a clear error" approach as elsewhere.
- Some parameters are reload-only, others require a restart, and some are outright fixed/rejected by CNPG (it validates against a list of unsupported/managed parameters, e.g. `shared_buffers` handled via `spec.postgresql.shared_buffers` or fixed ones like `listen_addresses`) — worth surfacing that distinction (or at least CNPG's validation error) in the UI rather than presenting all parameters as equally safe to change.
- Should this be a free-form key/value editor (closest to raw config, least opinionated), or offer curated fields with descriptions/defaults for the most commonly tuned parameters (e.g. `max_connections`, `work_mem`) — leaning toward free-form-plus-search given how many Postgres parameters exist, but worth deciding.
- Show current effective value (from `status`, if CNPG exposes applied config) alongside the desired `spec` value, so users can see when a change is still pending rollout — ties into the rolling-update visibility gap noted during the roadmap review.
