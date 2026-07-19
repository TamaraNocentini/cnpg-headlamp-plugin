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
import { ClusterDetail } from './components/clusters/Detail';
import { ClustersList } from './components/clusters/List';
import { ObjectStoreDetail } from './components/objectstores/Detail';
import { ObjectStoresList } from './components/objectstores/List';
import { PoolerDetail } from './components/poolers/Detail';
import { PoolersList } from './components/poolers/List';

registerSidebarEntry({
  name: 'CloudNativePG',
  url: '/cnpg/clusters',
  icon: 'mdi:database',
  parent: '',
  label: 'CloudNativePG',
});

registerSidebarEntry({
  name: 'Clusters',
  url: '/cnpg/clusters',
  parent: 'CloudNativePG',
  label: 'Clusters',
});

registerSidebarEntry({
  name: 'Poolers',
  url: '/cnpg/poolers',
  parent: 'CloudNativePG',
  label: 'Poolers',
});

registerSidebarEntry({
  name: 'ObjectStores',
  url: '/cnpg/objectstores',
  parent: 'CloudNativePG',
  label: 'ObjectStores',
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
