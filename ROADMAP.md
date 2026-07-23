# Roadmap

Backlog of features for the CNPG Headlamp plugin, numbered in the order they were captured (not priority). See "Suggested implementation order" below for sequencing.

## Shipped

- **Cluster list with health indicator** — traffic-light health (phase + WAL archiving + last backup conditions) on the clusters list and detail view.
- **Instance roles and synchronous replication warning** — current/target primary, instance counts, and a warning when multiple instances lack synchronous replication.
- **Instance/Postgres log access** — filterable (severity, logger, text search), color-coded, live-following log viewer per instance.
- **psql session against primary or a replica** — per-instance terminal action reusing Headlamp's pod exec, launched straight from the cluster detail view.
- Also shipped along the way: per-instance Node/QoS/timeline, cluster System ID/image/primary-promotion-time/timeline, all read from fields the operator already populates (no live PG connection needed).
- **#Storage (PVC) visibility and full-disk warnings** — directly extends the health indicator's root-cause story; effort depends on which data source we settle on (PVC objects alone vs. Prometheus/exec).
- **#Pooler (PgBouncer) visibility, creation, and editing** — list/detail views plus a guided Create form (`src/components/poolers/Create.tsx`); editing comes for free via Headlamp's built-in generic YAML edit dialog on any resource detail page, no plugin-specific work needed.
- **#14 Custom backup server name in the Cluster creation form** — optional "Server Name" field in the Backup section, defaulting to the cluster's own name when left empty.
- **#12 Container selector in the log viewer** — a container `Select` (shown only when a pod has more than one) in `PodLogViewer`'s toolbar; switching containers resets the severity/logger filters and re-subscribes to that container's logs. Also covers native sidecars (init containers with `restartPolicy: Always`, e.g. the Barman Cloud plugin's instance sidecar), which live in `spec.initContainers` rather than `spec.containers`, and preserving structured log fields beyond `ts`/`level`/`logger`/`msg` (e.g. `walName`, `elapsedWalTime`) that were previously silently dropped.
- **#7 Cluster creation form** — a single scrollable form rather than a multi-step wizard (matches the Pooler/ObjectStore Create forms' existing pattern, and avoided building new step-state UI machinery for a form whose sections aren't strictly sequential) covering instances/HA guidance, storage + tablespaces, backup, volume snapshots, and bootstrap method, with a live Monaco YAML preview (`src/components/clusters/Create.tsx`).
- **#8 Bootstrap a cluster from a backup (recovery)** — folded into the same Cluster creation form rather than a separate flow: the `recovery` bootstrap option generates the `externalClusters` entry + `serverName` needed to restore from an `ObjectStore`.
- **#13 YAML preview in every Create form** — factored into a shared `YamlPreview` component (`src/components/common/YamlPreview.tsx`) and rolled out to Pooler and ObjectStore alongside Cluster; each form now builds its manifest via a plain `build*Manifest()` function shared by the preview and the actual submit call.
- **#15 Referring Clusters section on the ObjectStore detail page** — `ReferringClustersSection` in `src/components/objectstores/Detail.tsx`, filtering namespace-scoped `Cluster`s via the new `Cluster.referencesObjectStoreAsBackup()`/`referencesObjectStoreAsRecoverySource()` helpers, with separate Backup Destination/Recovery Source columns since a cluster can match both.
- **#4 On-demand backups and backup list with status** — top-level `Backup` list/detail/create views (`src/components/backups/`), plain-text "Cluster" column matching `PoolersList`'s pattern. The Create form exposes a Method choice (`plugin` / `volumeSnapshot`, never the deprecated `barmanObjectStore`) gated on what the selected `Cluster` actually has configured (`spec.plugins` non-empty / `Cluster.volumeSnapshotClassName` set), plus an optional Target override. A "View Backups" `ActionButton` on the Cluster detail page links to `/cnpg/backups?cluster=&namespace=`, which `BackupsList` reads to pre-filter client-side. Note: `Backup` is a *request* — deleting one (via Headlamp's generic delete, which this plugin doesn't customize) does not delete the underlying data in the object store.
- **#5 Graphical scheduled backup configuration** — top-level `ScheduledBackup` list/detail/create views (`src/components/scheduledbackups/`), same placement and client-side cluster-filter pattern as #4 (own sidebar entry/route rather than a Backups-list tab, plus a matching "View Scheduled Backups" `ActionButton` on the Cluster detail page). The method/plugin/target sub-form was extracted out of #4's Create form into `src/components/common/BackupMethodFields.tsx` (a `useBackupMethodState` hook + presentational fields) so both Create forms share it verbatim rather than duplicating the cluster-capability-gating logic. The cron picker (`src/components/common/CronScheduleEditor.tsx`) supports Daily/Weekly/Monthly modes that build CNPG's 6-field (seconds-first) `spec.schedule`, plus an "Advanced" raw-text escape hatch for anything else; round-tripping an existing expression back into picker state only recognizes the shapes the editor itself generates (fixed seconds, numeric hour/minute, `*` month) — anything else falls back to Advanced rather than attempting full arbitrary-cron parsing. Uses `cronstrue` (already a transitive dependency of `@kinvolk/headlamp-plugin` via its own `CronJob` list, now declared directly since plugin bundles don't get the host app's transitive deps for free) to show a humanized description next to the raw expression, both in the editor and as a `HoverInfoLabel` tooltip in the list view. Also covers `spec.backupOwnerReference`, `spec.immediate`, and `spec.suspend` as form fields/toggles. A "Trigger Backup Now" `ActionButton` (on the detail page and as a list row action, `src/components/scheduledbackups/TriggerBackup.tsx`) creates a one-off `Backup` by copying the `ScheduledBackup`'s cluster/method/target/pluginConfiguration — no schedule involved, just a manifest-preview confirmation overlay before posting, same convention as the Create forms.
- **#16 Database Objects: `Database`, `DatabaseRole`, `Publication`, `Subscription`** — shipped as full top-level list/detail/create views (own sidebar entry/route each, `src/components/databases/`, `src/components/databaseroles/`, `src/components/publications/`, `src/components/subscriptions/`), **not** the embedded Cluster-detail-page section originally planned below. Deviated once Poolers/Backups/ScheduledBackups had already established the "own sidebar entry + client-side `?cluster=&namespace=` filter + `View X` button on the Cluster detail page" pattern for every other Cluster-scoped CRD in this plugin — treating these four differently (buried in an accordion, no dedicated Create forms) would have been the inconsistent choice, not the consistent one. All four now nest under a "Clusters" sidebar group (`ClustersGroup`) alongside `Clusters` itself, rather than sitting flat at the top level like Poolers/Backups — since unlike those, these four are meaningless without a Cluster context. `Publication`'s create form supports both `allTables` and a repeatable schema/table `objects` editor (with column list and `only`); `Subscription`'s create form picks the publisher from the subscriber Cluster's `spec.externalClusters` when available, falling back to free text otherwise. `Database`/`DatabaseRole`/`Publication`/`Subscription` all surface their `status.applied`/`status.message` reconciliation state via a shared `*AppliedLabel` component per resource, same idea as `PoolerStatusLabel`. Uncovered a plugin-wide bug along the way (routes default to `useClusterURL: true`, so a hand-built `history.push('/cnpg/...')` string 404s — must go through `Router.createRouteURL(routeName)` instead) that also affected the pre-existing Backups/ScheduledBackups `View X` buttons; fixed everywhere at once (see the "Never build a `history.push()` target as a raw literal path string" entry in `CLAUDE.md`).

## Suggested implementation order

Ordered by dependencies first, then easy-and-high-value before harder/riskier or externally-dependent work.

1. **#11 Operator/plugin status overview page** — moderate effort, but high trust value (answers "is CNPG even installed correctly, and is the Barman Cloud plugin present?" before a user tries to use any of the backup/recovery features).
2. **#10 Storage (PVC) visibility and full-disk warnings** — extends the PVC visibility already shipped in `PvcsSection`; independent, moderate effort.
3. **#6 Basic monitoring via Prometheus metrics** — optional external dependency (Prometheus must be present) and its own charting integration; highest effort for the payoff versus everything else here, and #10's "running low" threshold could optionally lean on Prometheus volume metrics once this exists, so doing #10 first isn't wasted work either way.

## 6. Basic monitoring via Prometheus metrics

Add charts (replication lag, WAL archiving status, connection counts, etc.) to the cluster/instance detail views, sourced from Prometheus.

Open questions to resolve during implementation:
- Follow the pattern from the official `prometheus` plugin (`official-plugins/prometheus/src/request.tsx` and `official-plugins/prometheus/src/components/Chart/`) for querying Prometheus and rendering charts, rather than building a new charting approach.
- CNPG's instance manager exposes its own Prometheus metrics endpoint — need to enumerate which `cnpg_*` metrics are most useful here (replication lag, WAL archiving status/failures, connection counts) and confirm exact metric names against the CNPG version in use.
- Must degrade gracefully when no Prometheus is deployed/scraping CNPG targets in the cluster — detect availability and hide/disable charts rather than erroring, since this is an optional dependency, not a hard requirement.
- Decide whether this reuses the official `prometheus` plugin's request/data-fetching module directly (as a dependency) or just copies the pattern to keep this plugin self-contained.

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
