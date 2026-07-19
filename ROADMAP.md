# Roadmap

Backlog of features for the CNPG Headlamp plugin, numbered in the order they were captured (not priority). See "Suggested implementation order" below for sequencing.

## Shipped

- **Cluster list with health indicator** — traffic-light health (phase + WAL archiving + last backup conditions) on the clusters list and detail view.
- **Instance roles and synchronous replication warning** — current/target primary, instance counts, and a warning when multiple instances lack synchronous replication.
- **Instance/Postgres log access** — filterable (severity, logger, text search), color-coded, live-following log viewer per instance.
- **psql session against primary or a replica** — per-instance terminal action reusing Headlamp's pod exec, launched straight from the cluster detail view.
- Also shipped along the way: per-instance Node/QoS/timeline, cluster System ID/image/primary-promotion-time/timeline, all read from fields the operator already populates (no live PG connection needed).
- **#Storage (PVC) visibility and full-disk warnings** — directly extends the health indicator's root-cause story; effort depends on which data source we settle on (PVC objects alone vs. Prometheus/exec).
- **#Pooler (PgBouncer) visibility** — same CRD-listing pattern as the cluster list, applied to a second resource type; mostly independent.

## Suggested implementation order

Ordered by dependencies first, then easy-and-high-value before harder/riskier or externally-dependent work.

0. **#12 Container selector in the log viewer** — needed now: now that Cluster creation can enable
   the Barman Cloud plugin (#7/#8, shipped), instance pods can run more than one container, and the
   log viewer can currently only ever show the first one.
3. **#4 On-demand backups and backup list with status** — moderate effort (create a `Backup` CR, list `status`), doesn't require the Barman Cloud plugin to already be scoped out.
4. **#5 Graphical scheduled backup configuration** — builds directly on #4's method/target sub-form.
6. **#6 Basic monitoring via Prometheus metrics** — optional external dependency (Prometheus must be present) and its own charting integration; higher effort for the payoff versus storage/log visibility.
7. **#7 Multi-step cluster creation wizard** — highest-effort form work, and deliberately reuses the sync-replication warning and backup (#4/#5) sub-forms, so should come after those exist.
8. **#8 Bootstrap a cluster from a backup (recovery)** — depends on #7's wizard scaffolding *and* an external Barman Cloud plugin dependency; most moving pieces, so last.

## 4. On-demand backups and backup list with status

Let users trigger an on-demand backup for a cluster, and list existing `Backup` resources with their status.

Open questions to resolve during implementation:
- Triggering a backup means creating a `Backup` CR (referencing the target `Cluster`) — need to confirm whether to expose backup method/target options (e.g. `spec.method`: `barmanObjectStore` vs `volumeSnapshot`, `spec.target`: `primary`/`prefer-standby`) or just use the cluster's configured defaults.
- Creating this CR requires `create` RBAC on `backups.postgresql.cnpg.io` in the namespace — let Kubernetes enforce it, but surface a clear error rather than failing silently.
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
- Should reuse the already-shipped sync-replication warning (e.g. nudge/default toward sync replication when instance count > 1) and the backup sub-form from #4/#5 for the optional backup step, rather than duplicating that logic.
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
- A `Pooler`'s health is effectively an extension of its cluster's health — decide whether/how it factors into the cluster health indicator, or is shown as a separate but adjacent status.
- Surface key `spec` settings at a glance (pooling mode `session`/`transaction`/`statement`, instance count, target `type`: `rw`/`ro`) and `status` (instance readiness) similar to how the cluster detail shows primary/replica roles.
- Decide whether creating/editing Poolers is in scope here too, or just visibility for now (creation could be a later, separate item).

## 10. Storage (PVC) visibility and full-disk warnings

Surface per-instance PVC usage (capacity vs. used) in the cluster/instance detail view, with a warning when storage is running low or full.

Open questions to resolve during implementation:
- This is one of the more common real-world causes of a cluster going unhealthy (WAL archiving stalls, cluster degrades) — should tie directly into the health indicator's root-cause story, e.g. surfacing "storage almost full" as the likely explanation when phase/WAL archiving turns red/yellow.
- PVC capacity/usage isn't available from the `Cluster` CR itself — likely needs `kubectl` PVC objects for capacity plus either Prometheus node/kubelet volume metrics (ties into #6) or `df`-via-exec for actual used space; need to decide which source to rely on and what to do when neither is available.
- CNPG supports separate WAL and tablespace PVCs per instance (not just the main data volume) — need to show all relevant volumes per instance, not just the primary data PVC.
- Threshold for "running low" (e.g. percentage-based warning) should probably be configurable rather than hardcoded.

## 11. Operator/plugin status overview page

A landing page for the top-level "CloudNativePG" sidebar entry (which currently just points at
`/cnpg/clusters`) showing the health of the CNPG installation itself: whether the operator is
running, its version, and which CNPG-i plugins (Barman Cloud, etc.) are installed and healthy —
rather than dropping straight into the cluster list with no indication of whether the operator
or the plugins backup/recovery features depend on are even present.

Open questions to resolve during implementation:
- Operator status is likely derived from the `cnpg-controller-manager` Deployment/Pods (replicas
  ready, image/version) in whichever namespace it's installed into — need to confirm how to
  locate that namespace reliably (label selector vs. a configurable/discovered value) rather than
  hardcoding `cnpg-system`.
- Installed CNPG-i plugins (e.g. Barman Cloud) register themselves via a sidecar/deployment plus
  a `Secret`/CRD footprint — need to determine the most reliable signal to enumerate "installed
  plugins" (e.g. presence of `objectstores.barmancloud.cnpg.io` CRD for Barman Cloud) versus
  querying the plugin registration mechanism CNPG-i itself exposes, if any.
- Decide whether the "CloudNativePG" sidebar entry's `url` changes to point at this new page
  (with Clusters becoming a normal child entry), or whether this ships as an additional child
  entry alongside Clusters/Poolers/ObjectStores — changing the parent's target affects existing
  navigation muscle memory.
- Should missing/unhealthy pieces (operator down, expected plugin not installed) surface actionable
  guidance (e.g. link to install docs) rather than just a red status, consistent with the
  graceful-degradation approach planned for Prometheus (#6) and the Barman Cloud plugin dependency
  in #8.

## 12. Container selector in the log viewer

`PodLogViewer` (`src/components/common/podActions.tsx`) currently hardcodes
`const container = pod.spec.containers[0]?.name;` — it only ever shows logs from the pod's first
container. That was fine while every CNPG instance pod ran a single `postgres` container, but the
Barman Cloud plugin (now wired up via #7/#8's Cluster creation form) adds a sidecar container to
instance pods when enabled, and its logs live in that sidecar, not the main container. Needed now,
not just eventually.

Open questions to resolve during implementation:
- Add a container `Select` (populated from `pod.spec.containers`, defaulting to the current
  first-container behavior) to `PodLogViewer`'s `topActions`, alongside the existing
  severity/logger/search filters.
- `formatCnpgLogLine`/`parseCnpgLogLine` (`src/resources/cnpgLog.ts`) assume CNPG's structured JSON
  log format — the plugin sidecar's logs likely aren't in that format, so switching containers
  probably needs to fall back to showing raw log lines rather than trying to parse everything as a
  CNPG log line.
- `pod.getLogs(container, ...)` already takes the container name as a parameter — switching
  containers just means re-subscribing with a new name; needs care to cancel the previous
  subscription (the existing `useEffect` cleanup already does this for pod changes, extend the
  same dependency array to include the selected container).
- Same gap likely exists whenever backup jobs or other multi-container pods appear elsewhere in
  the plugin — worth checking `JobsSection`/`InstancesSection` in `src/components/clusters/Detail.tsx`
  for other spots assuming a single container.

## 13. YAML preview in every Create form

The Cluster creation form (`src/components/clusters/Create.tsx`) has a collapsible "Review YAML"
section using a read-only, syntax-highlighted `@monaco-editor/react` editor (the same engine
Headlamp's own YAML dialogs use), built from a `buildClusterManifest()` function shared with the
actual submit call so the preview can't drift from what gets applied. It's a big trust win for a
form this complex — worth bringing to the simpler Pooler and ObjectStore Create forms too
(`src/components/poolers/Create.tsx`, `src/components/objectstores/Create.tsx`), for consistency
and because "see exactly what will be created before you click Create" is valuable even for
smaller forms.

Open questions to resolve during implementation:
- Factor the Monaco YAML-preview accordion itself into a shared component (e.g.
  `src/components/common/YamlPreview.tsx` taking a manifest object) rather than copy-pasting the
  `Accordion`/`Editor`/theme-wiring block three times — the Cluster form's version was written
  before this was a cross-form pattern.
- Each form already builds its POST payload inline in `handleSubmit`; refactor each to the same
  "plain manifest-building function shared by preview and submit" shape `buildClusterManifest`
  uses, so all three forms guarantee the preview matches what's actually sent.
- `@monaco-editor/react` and `js-yaml` are already direct dependencies (added for the Cluster
  form) — no new dependency work needed, just reuse.
