/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import { BackupDetail } from './components/backups/Detail';
import { BackupsList } from './components/backups/List';
import { ClusterImageCatalogDetail } from './components/clusterimagecatalogs/Detail';
import { ClusterImageCatalogsList } from './components/clusterimagecatalogs/List';
import { ClusterDetail } from './components/clusters/Detail';
import { ClustersList } from './components/clusters/List';
import { DatabaseRoleDetail } from './components/databaseroles/Detail';
import { DatabaseRolesList } from './components/databaseroles/List';
import { DatabaseDetail } from './components/databases/Detail';
import { DatabasesList } from './components/databases/List';
import { ImageCatalogDetail } from './components/imagecatalogs/Detail';
import { ImageCatalogsList } from './components/imagecatalogs/List';
import { ObjectStoreDetail } from './components/objectstores/Detail';
import { ObjectStoresList } from './components/objectstores/List';
import { PoolerDetail } from './components/poolers/Detail';
import { PoolersList } from './components/poolers/List';
import { PublicationDetail } from './components/publications/Detail';
import { PublicationsList } from './components/publications/List';
import { ScheduledBackupDetail } from './components/scheduledbackups/Detail';
import { ScheduledBackupsList } from './components/scheduledbackups/List';
import { OperatorStatus } from './components/status/OperatorStatus';
import { SubscriptionDetail } from './components/subscriptions/Detail';
import { SubscriptionsList } from './components/subscriptions/List';

registerSidebarEntry({
  name: 'CloudNativePG',
  // Points at the operator/plugin status overview rather than straight at the cluster list, so
  // clicking the top-level sidebar entry answers "is CNPG even installed correctly?" first.
  url: '/cnpg/status',
  icon: 'mdi:database',
  parent: '',
  label: 'CloudNativePG',
});

registerSidebarEntry({
  name: 'Status',
  url: '/cnpg/status',
  parent: 'CloudNativePG',
  label: 'Status',
});

registerSidebarEntry({
  name: 'ClustersGroup',
  // See the equivalent comment on ImageCatalogsGroup below: without an explicit url this group
  // link would resolve to nothing (its name/first-child-name isn't a registered route name) and
  // never expand, so it's pointed straight at the first child's page instead.
  url: '/cnpg/clusters',
  parent: 'CloudNativePG',
  label: 'Postgres Clusters',
});

registerSidebarEntry({
  name: 'Clusters',
  url: '/cnpg/clusters',
  parent: 'ClustersGroup',
  label: 'Clusters',
});

registerSidebarEntry({
  name: 'Databases',
  url: '/cnpg/databases',
  parent: 'ClustersGroup',
  label: 'Databases',
});

registerSidebarEntry({
  name: 'DatabaseRoles',
  url: '/cnpg/databaseroles',
  parent: 'ClustersGroup',
  label: 'Roles',
});

registerSidebarEntry({
  name: 'Publications',
  url: '/cnpg/publications',
  parent: 'ClustersGroup',
  label: 'Publications',
});

registerSidebarEntry({
  name: 'Subscriptions',
  url: '/cnpg/subscriptions',
  parent: 'ClustersGroup',
  label: 'Subscriptions',
});

registerSidebarEntry({
  name: 'Poolers',
  url: '/cnpg/poolers',
  parent: 'CloudNativePG',
  label: 'Poolers',
});

registerSidebarEntry({
  name: 'BackupsGroup',
  // See the equivalent comment on ImageCatalogsGroup below: without an explicit url this group
  // link would resolve to nothing (its name/first-child-name isn't a registered route name) and
  // never expand, so it's pointed straight at the first child's page instead.
  url: '/cnpg/backups',
  parent: 'CloudNativePG',
  label: 'Backups',
});

registerSidebarEntry({
  name: 'Backups',
  url: '/cnpg/backups',
  parent: 'BackupsGroup',
  label: 'Backups',
});

registerSidebarEntry({
  name: 'ScheduledBackups',
  url: '/cnpg/scheduledbackups',
  parent: 'BackupsGroup',
  label: 'Scheduled Backups',
});

registerSidebarEntry({
  name: 'ObjectStores',
  url: '/cnpg/objectstores',
  parent: 'BackupsGroup',
  label: 'Object Stores',
});

registerSidebarEntry({
  name: 'ImageCatalogsGroup',
  // Without an explicit url, Headlamp's SidebarItem falls back to resolving a route named after
  // this entry (or its first child's sidebar-entry name), not the actual registered route name —
  // and our routes are deliberately prefixed (e.g. 'CnpgImageCatalogs', see CLAUDE.md) to dodge
  // naming collisions, so that fallback resolves to nothing and the group becomes an inert link
  // that never expands. Pointing it straight at the first child's page, like the top-level
  // 'CloudNativePG' entry does, fixes both problems at once.
  url: '/cnpg/imagecatalogs',
  parent: 'CloudNativePG',
  label: 'Image Catalogs',
});

registerSidebarEntry({
  name: 'ImageCatalogs',
  url: '/cnpg/imagecatalogs',
  parent: 'ImageCatalogsGroup',
  label: 'Image Catalog',
});

registerSidebarEntry({
  name: 'ClusterImageCatalogs',
  url: '/cnpg/clusterimagecatalogs',
  parent: 'ImageCatalogsGroup',
  label: 'Cluster Image Catalog',
});

registerRoute({
  path: '/cnpg/status',
  sidebar: 'Status',
  name: 'CnpgStatus',
  exact: true,
  component: () => <OperatorStatus />,
});

registerRoute({
  path: '/cnpg/clusters',
  sidebar: 'Clusters',
  // Route "name" must be unique across Headlamp (built-in and plugins) — 'Cluster'/'cluster'
  // collides with Headlamp's own multi-cluster context route, so these are prefixed.
  name: 'CnpgClusters',
  // Without this, this route's path can still prefix-match the (longer) detail route's path
  // below, so this list keeps rendering instead of yielding to the detail route.
  exact: true,
  component: () => <ClustersList />,
});

registerRoute({
  path: '/cnpg/clusters/:namespace/:name',
  sidebar: 'Clusters',
  name: 'CnpgClusterDetail',
  exact: true,
  component: () => <ClusterDetail />,
});

registerRoute({
  path: '/cnpg/databases',
  sidebar: 'Databases',
  name: 'CnpgDatabases',
  exact: true,
  component: () => <DatabasesList />,
});

registerRoute({
  path: '/cnpg/databases/:namespace/:name',
  sidebar: 'Databases',
  name: 'CnpgDatabaseDetail',
  exact: true,
  component: () => <DatabaseDetail />,
});

registerRoute({
  path: '/cnpg/databaseroles',
  sidebar: 'DatabaseRoles',
  name: 'CnpgDatabaseRoles',
  exact: true,
  component: () => <DatabaseRolesList />,
});

registerRoute({
  path: '/cnpg/databaseroles/:namespace/:name',
  sidebar: 'DatabaseRoles',
  name: 'CnpgDatabaseRoleDetail',
  exact: true,
  component: () => <DatabaseRoleDetail />,
});

registerRoute({
  path: '/cnpg/poolers',
  sidebar: 'Poolers',
  name: 'CnpgPoolers',
  exact: true,
  component: () => <PoolersList />,
});

registerRoute({
  path: '/cnpg/poolers/:namespace/:name',
  sidebar: 'Poolers',
  name: 'CnpgPoolerDetail',
  exact: true,
  component: () => <PoolerDetail />,
});

registerRoute({
  path: '/cnpg/objectstores',
  sidebar: 'ObjectStores',
  name: 'CnpgObjectStores',
  exact: true,
  component: () => <ObjectStoresList />,
});

registerRoute({
  path: '/cnpg/objectstores/:namespace/:name',
  sidebar: 'ObjectStores',
  name: 'CnpgObjectStoreDetail',
  exact: true,
  component: () => <ObjectStoreDetail />,
});

registerRoute({
  path: '/cnpg/backups',
  sidebar: 'Backups',
  name: 'CnpgBackups',
  exact: true,
  component: () => <BackupsList />,
});

registerRoute({
  path: '/cnpg/backups/:namespace/:name',
  sidebar: 'Backups',
  name: 'CnpgBackupDetail',
  exact: true,
  component: () => <BackupDetail />,
});

registerRoute({
  path: '/cnpg/scheduledbackups',
  sidebar: 'ScheduledBackups',
  name: 'CnpgScheduledBackups',
  exact: true,
  component: () => <ScheduledBackupsList />,
});

registerRoute({
  path: '/cnpg/scheduledbackups/:namespace/:name',
  sidebar: 'ScheduledBackups',
  name: 'CnpgScheduledBackupDetail',
  exact: true,
  component: () => <ScheduledBackupDetail />,
});

registerRoute({
  path: '/cnpg/publications',
  sidebar: 'Publications',
  name: 'CnpgPublications',
  exact: true,
  component: () => <PublicationsList />,
});

registerRoute({
  path: '/cnpg/publications/:namespace/:name',
  sidebar: 'Publications',
  name: 'CnpgPublicationDetail',
  exact: true,
  component: () => <PublicationDetail />,
});

registerRoute({
  path: '/cnpg/subscriptions',
  sidebar: 'Subscriptions',
  name: 'CnpgSubscriptions',
  exact: true,
  component: () => <SubscriptionsList />,
});

registerRoute({
  path: '/cnpg/subscriptions/:namespace/:name',
  sidebar: 'Subscriptions',
  name: 'CnpgSubscriptionDetail',
  exact: true,
  component: () => <SubscriptionDetail />,
});

registerRoute({
  path: '/cnpg/imagecatalogs',
  sidebar: 'ImageCatalogs',
  name: 'CnpgImageCatalogs',
  exact: true,
  component: () => <ImageCatalogsList />,
});

registerRoute({
  path: '/cnpg/imagecatalogs/:namespace/:name',
  sidebar: 'ImageCatalogs',
  name: 'CnpgImageCatalogDetail',
  exact: true,
  component: () => <ImageCatalogDetail />,
});

registerRoute({
  path: '/cnpg/clusterimagecatalogs',
  sidebar: 'ClusterImageCatalogs',
  name: 'CnpgClusterImageCatalogs',
  exact: true,
  component: () => <ClusterImageCatalogsList />,
});

// Cluster-scoped, so this route has no :namespace segment — same pattern as ClusterIssuer in the
// official cert-manager plugin.
registerRoute({
  path: '/cnpg/clusterimagecatalogs/:name',
  sidebar: 'ClusterImageCatalogs',
  name: 'CnpgClusterImageCatalogDetail',
  exact: true,
  component: () => <ClusterImageCatalogDetail />,
});
