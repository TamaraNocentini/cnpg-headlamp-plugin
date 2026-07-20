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

## Suggested implementation order

Ordered by dependencies first, then easy-and-high-value before harder/riskier or externally-dependent work.

1. **#4 On-demand backups and backup list with status** — moderate effort (create a `Backup` CR, list `status`), doesn't require the Barman Cloud plugin to already be scoped out. Establishes the top-level Backups list/detail views (with a "Cluster" column, same pattern as Poolers/ObjectStores) that #5 builds on.
2. **#5 Graphical scheduled backup configuration** — builds directly on #4's method/target sub-form and shares its top-level list pattern.
3. **#16 Database Objects section on the Cluster detail page** — a different organizing pattern than #4/#5 (embedded Cluster-detail-page section, not a top-level list — see #16 for why), independent CRDs though, so no ordering dependency on #4/#5.
4. **#11 Operator/plugin status overview page** — independent of the above; moderate effort, but high trust value (answers "is CNPG even installed correctly, and is the Barman Cloud plugin present?" before a user tries to use any of the backup/recovery features).
5. **#10 Storage (PVC) visibility and full-disk warnings** — extends the PVC visibility already shipped in `PvcsSection`; independent, moderate effort.
6. **#6 Basic monitoring via Prometheus metrics** — optional external dependency (Prometheus must be present) and its own charting integration; highest effort for the payoff versus everything else here, and #10's "running low" threshold could optionally lean on Prometheus volume metrics once this exists, so doing #10 first isn't wasted work either way.

## 4. On-demand backups and backup list with status

Let users trigger an on-demand backup for a cluster, and list existing `Backup` resources with
their status.

Decisions already made (see #16 for the sibling "how do we organize the rest of the Cluster-related
CRDs" discussion this came out of):
- `Backup` is really a **backup request**, not the backup itself — deleting the CR does not delete
  the underlying data in the object store. Any delete action in the UI must make this explicit
  (e.g. confirmation copy along the lines of "this only removes the request record; the backup
  itself stays in the object store"), so users don't mistake it for actual deletion.
- Surfaced as a **top-level Backups list/detail view** (`src/components/backups/List.tsx`,
  `Detail.tsx`), same pattern as `Pooler`/`ObjectStore` — a "Cluster" column with a `ResourceLink`
  back to the owning cluster (exactly like `PoolersList` already does), rather than a section
  embedded in the Cluster detail page. Rationale (revisited after initially planning this as a
  Cluster-detail section): unlike the four CRDs in #16, `Backup`/`ScheduledBackup` aren't
  Postgres-level database objects — they're Kubernetes-level operational records — so a flat,
  filterable list of their own is a better fit, and it keeps the already-long Cluster detail page
  from growing further.
- Add a lightweight **"View Backups" link/button on the Cluster detail page** (linking to the
  top-level Backups list pre-filtered to that cluster) so at-a-glance backup status isn't lost by
  not embedding the full section there.

Open questions to resolve during implementation:
- Triggering a backup means creating a `Backup` CR (referencing the target `Cluster`) — need to confirm whether to expose backup method/target options (e.g. `spec.method`: `barmanObjectStore` vs `volumeSnapshot`, `spec.target`: `primary`/`prefer-standby`) or just use the cluster's configured defaults.
- Creating this CR requires `create` RBAC on `backups.postgresql.cnpg.io` in the namespace — let Kubernetes enforce it, but surface a clear error rather than failing silently.
- Backup list status comes from `status.phase` (`pending`/`running`/`completed`/`failed`) plus `status.startedAt`/`stoppedAt`/`error`.
- How the "View Backups" link on Cluster detail passes the pre-filter — a query param the Backups list reads on mount, versus just linking to the plain list and letting the user filter manually — needs whatever filtering mechanism `ResourceListView` supports investigated first.

## 5. Graphical scheduled backup configuration

Let users create/edit `ScheduledBackup` resources through a form (day/time/frequency pickers) instead of hand-writing the cron expression in `spec.schedule`. `ScheduledBackup` doesn't hold backup data itself — it just creates `Backup` CRs (#4) on a schedule — so this is UI sugar over the same underlying mechanism, not a separate concern.

Decisions already made:
- Same placement as #4: a **top-level ScheduledBackups list/detail view**, not a Cluster-detail-page section — see #4's placement rationale. Likely its own sidebar entry/route, but consider whether it's worth surfacing as a secondary tab/filter on the same Backups list instead of a fully separate page, given how tightly related the two resources are.

Open questions to resolve during implementation:
- CNPG's `spec.schedule` is a 6-field cron (with seconds) rather than standard 5-field cron — the form needs to build/parse that format correctly, and probably show the generated expression alongside the picker for transparency/trust.
- Should the form only support common patterns (daily/weekly/monthly at a given time) with an "advanced: raw cron" escape hatch, or try to fully round-trip arbitrary cron expressions back into picker state?
- Same `spec.method`/`spec.target` options as on-demand backups (#4) apply here — likely want to share that sub-form between the two features.
- Also covers `spec.suspend` (pause a schedule without deleting it) and `spec.immediate` (run once at creation) — worth exposing as simple toggles.
- List view: show existing `ScheduledBackup`s per cluster with next-run time (derived from the cron expression) and last outcome — same "Cluster" column pattern as the Backups list from #4.

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

## 16. Database Objects section on the Cluster detail page

CNPG's declarative database-object management adds four more CRDs, all `postgresql.cnpg.io/v1`,
all namespaced, and each always relating to exactly one `Cluster`: `Database`, `DatabaseRole`,
`Publication`, `Subscription`. Initially grouped with `Backup`/`ScheduledBackup` (#4/#5) under one
"how do we organize all six Cluster-related CRDs" question — revisited since, with a key
distinction: `Backup`/`ScheduledBackup` are Kubernetes-level operational records (#4/#5 ship as
top-level lists), while these four are genuinely **Postgres-level database objects** — they only
exist and only mean anything in the context of the one `Cluster` whose database they configure. So
they surface as a **"Database Objects" section on the Cluster detail page** instead, same
client-side-filtered-list pattern as `PoolersSection`.

Decisions already made:
- No new top-level sidebar entries or routes for these four CRDs specifically (unlike #4/#5) —
  they only make sense in the context of one `Cluster`'s live database state, so burying
  discoverability one click into the Cluster detail page is the right trade for now. Revisit only
  if a cross-cluster view turns out to be needed (e.g. "find every database named X across all
  clusters").

Open questions to resolve during implementation:
- Filtering: unlike `Pooler` (which references its cluster via `spec.cluster.name`, see
  `PoolersSection`), confirm the exact reference field on each of these four CRDs — CNPG's pattern
  for cluster-scoped declarative objects is usually `spec.cluster.name` too, but verify per-CRD
  rather than assuming.
- `Database`/`Publication`/`Subscription` all have a reconciliation `status` (e.g. `applied`,
  `message`) reflecting whether CNPG successfully applied the declarative object inside Postgres —
  surface that status the same way `PoolerStatusLabel`/health indicators do elsewhere, since a
  declarative object silently failing to apply is the main failure mode worth surfacing.
- `DatabaseRole` can hold sensitive configuration (password secret references, `CONNECTION LIMIT`,
  role membership) — decide how much detail to show inline in the section's table vs. requiring a
  drill-down (there's no per-CRD detail page planned here, just a table row, unlike `Backup`).
- Whether create/edit forms for these four are in scope of this item or a later follow-up — visibility-only first (matching how Pooler/ObjectStore visibility shipped before their Create forms) is likely the right first cut given there are four CRDs to cover at once.
- The Cluster detail page is already getting long (Instances, Jobs, Storage, Poolers, Referring
  info, Conditions, and now this section) — undecided yet whether to default less-critical
  sections (this one included) to a collapsed `Accordion` (reusing the pattern already used for
  `YamlPreview`) versus a bigger restructure into tabs; resolve this before or alongside
  implementing this section rather than adding to the page unstyled.
