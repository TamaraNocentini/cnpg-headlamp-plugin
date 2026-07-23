import { K8s, Router } from '@kinvolk/headlamp-plugin/lib';
import {
  ActionButton,
  ConditionsTable,
  DateLabel,
  DetailsGrid,
  ResourceLink,
  SectionBox,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useHistory, useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { Pooler } from '../../resources/pooler';
import { launchLogs, launchTerminal, Pod, PodPhaseLabel } from '../common/podActions';
import { PoolerStatusLabel } from '../poolers/List';
import { launchConnectActivity } from './connect';

const { createRouteURL } = Router;

type Pvc = InstanceType<typeof K8s.ResourceClasses.PersistentVolumeClaim>;

function InstanceActions({ pod }: { pod: Pod }) {
  return (
    <>
      <ActionButton
        description="View logs"
        icon="mdi:file-document-box-outline"
        onClick={() => launchLogs(pod)}
      />
      <ActionButton
        description="Open terminal"
        icon="mdi:console"
        onClick={() => launchTerminal(pod)}
      />
    </>
  );
}

// Bootstrap job pods (initdb/join/full-recovery/...) don't have a running container to exec
// into once complete, so only logs make sense here — no terminal action.
function JobActions({ pod }: { pod: Pod }) {
  return (
    <ActionButton
      description="View logs"
      icon="mdi:file-document-box-outline"
      onClick={() => launchLogs(pod)}
    />
  );
}

function InstanceRoleLabel({ pod }: { pod: Pod }) {
  const role = pod.metadata.labels?.['cnpg.io/instanceRole'] ?? '-';
  const isReady = pod.status.containerStatuses?.every(container => container.ready) ?? false;

  if (!isReady) {
    return <StatusLabel status="error">{role} (not ready)</StatusLabel>;
  }
  switch (role) {
    case 'primary':
      return <StatusLabel status="success">primary</StatusLabel>;
    case 'replica':
      return <StatusLabel status="">replica</StatusLabel>;
    case 'unhealthy':
      return <StatusLabel status="error">unhealthy</StatusLabel>;
    default:
      return <>{role}</>;
  }
}

function InstancesSection({ cluster }: { cluster: Cluster }) {
  // cnpg.io/podRole=instance excludes the transient initdb/join/full-recovery bootstrap job pods
  // (see JobsSection), which also carry the cnpg.io/cluster label but aren't instances.
  const [pods] = K8s.ResourceClasses.Pod.useList({
    namespace: cluster.getNamespace(),
    labelSelector: `cnpg.io/cluster=${cluster.getName()},cnpg.io/podRole=instance`,
  });

  return (
    <SectionBox title="Instances">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            getter: (pod: Pod) => <ResourceLink resource={pod} />,
          },
          {
            label: 'Role',
            getter: (pod: Pod) => <InstanceRoleLabel pod={pod} />,
          },
          {
            label: 'Phase',
            getter: (pod: Pod) => pod.status.phase,
          },
          {
            label: 'Timeline',
            getter: (pod: Pod) =>
              cluster.getInstanceReportedState(pod.getName())?.timeLineID ?? '-',
          },
          {
            label: 'Node',
            getter: (pod: Pod) => pod.spec.nodeName,
          },
          {
            label: 'QoS',
            getter: (pod: Pod) => pod.status.qosClass ?? '-',
          },
          {
            label: 'Actions',
            getter: (pod: Pod) => <InstanceActions pod={pod} />,
          },
        ]}
        data={pods ?? []}
      />
    </SectionBox>
  );
}

function JobsSection({ cluster }: { cluster: Cluster }) {
  // cnpg.io/jobRole (initdb, join, full-recovery, ...) identifies the transient bootstrap job
  // pods CNPG creates alongside instances — they carry cnpg.io/cluster too but not podRole.
  const [pods] = K8s.ResourceClasses.Pod.useList({
    namespace: cluster.getNamespace(),
    labelSelector: `cnpg.io/cluster=${cluster.getName()},cnpg.io/jobRole`,
  });

  // Hide the section once we know there are no bootstrap jobs, rather than showing an empty
  // table — but keep rendering (with a loading state) while pods is still null.
  if (pods && pods.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Jobs">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            getter: (pod: Pod) => <ResourceLink resource={pod} />,
          },
          {
            label: 'Job Role',
            getter: (pod: Pod) => pod.metadata.labels?.['cnpg.io/jobRole'] ?? '-',
          },
          {
            label: 'Phase',
            getter: (pod: Pod) => <PodPhaseLabel pod={pod} />,
          },
          {
            label: 'Node',
            getter: (pod: Pod) => pod.spec.nodeName,
          },
          {
            label: 'Actions',
            getter: (pod: Pod) => <JobActions pod={pod} />,
          },
        ]}
        data={pods ?? []}
        emptyMessage="No bootstrap jobs running"
      />
    </SectionBox>
  );
}

function PvcPhaseLabel({ pvc }: { pvc: Pvc }) {
  const phase = pvc.status?.phase;
  switch (phase) {
    case 'Bound':
      return <StatusLabel status="success">{phase}</StatusLabel>;
    case 'Lost':
      return <StatusLabel status="error">{phase}</StatusLabel>;
    case 'Pending':
      return <StatusLabel status="warning">{phase}</StatusLabel>;
    default:
      return <StatusLabel status="">{phase}</StatusLabel>;
  }
}

function PvcsSection({ cluster }: { cluster: Cluster }) {
  // Every instance can have more than one PVC (PG_DATA, PG_WAL, and optionally per-tablespace
  // volumes), each labeled with which instance and role it belongs to.
  const [pvcs] = K8s.ResourceClasses.PersistentVolumeClaim.useList({
    namespace: cluster.getNamespace(),
    labelSelector: `cnpg.io/cluster=${cluster.getName()}`,
  });

  return (
    <SectionBox title="Storage">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            getter: (pvc: Pvc) => <ResourceLink resource={pvc} />,
          },
          {
            label: 'Instance',
            getter: (pvc: Pvc) => pvc.metadata.labels?.['cnpg.io/instanceName'] ?? '-',
          },
          {
            label: 'Role',
            getter: (pvc: Pvc) => pvc.metadata.labels?.['cnpg.io/pvcRole'] ?? '-',
          },
          {
            label: 'Status',
            getter: (pvc: Pvc) => <PvcPhaseLabel pvc={pvc} />,
          },
          {
            label: 'Capacity',
            getter: (pvc: Pvc) =>
              pvc.status?.capacity?.storage ?? pvc.spec?.resources?.requests?.storage ?? '-',
          },
          {
            label: 'Storage Class',
            getter: (pvc: Pvc) => pvc.spec?.storageClassName ?? '-',
          },
        ]}
        data={pvcs ?? []}
      />
    </SectionBox>
  );
}

function PoolersSection({ cluster }: { cluster: Cluster }) {
  // Poolers reference their cluster by spec.cluster.name rather than a label, so we fetch
  // every Pooler in the namespace and filter client-side instead of using a labelSelector.
  const [allPoolers] = Pooler.useList({ namespace: cluster.getNamespace() });
  const poolers = allPoolers?.filter(pooler => pooler.clusterName === cluster.getName());

  if (poolers && poolers.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Poolers">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            // ResourceLink defaults its route lookup to resource.kind ('Pooler'), but our route
            // is registered as 'CnpgPoolerDetail' (see index.tsx) to dodge a naming collision —
            // so the default lookup fails silently and needs this explicit override. Pod/PVC
            // links elsewhere in this file don't need it since those are core Headlamp types
            // whose routes are already registered under their bare kind name.
            getter: (pooler: Pooler) => (
              <ResourceLink resource={pooler} routeName="CnpgPoolerDetail" />
            ),
          },
          {
            label: 'Type',
            getter: (pooler: Pooler) => pooler.type,
          },
          {
            label: 'Pool Mode',
            getter: (pooler: Pooler) => pooler.poolMode ?? '-',
          },
          {
            label: 'Instances',
            getter: (pooler: Pooler) => pooler.instances,
          },
          {
            label: 'Status',
            getter: (pooler: Pooler) => <PoolerStatusLabel pooler={pooler} />,
          },
        ]}
        data={poolers ?? []}
      />
    </SectionBox>
  );
}

export function ClusterDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const history = useHistory();

  return (
    <DetailsGrid
      resourceType={Cluster}
      name={name}
      namespace={namespace}
      withEvents
      actions={item =>
        item && [
          <ActionButton
            key="connect"
            description="Connect"
            icon="mdi:power-plug-outline"
            onClick={() => launchConnectActivity(item)}
          />,
          <ActionButton
            key="view-databases"
            description="View Databases"
            icon="mdi:database-outline"
            onClick={() =>
              history.push(
                `${createRouteURL('CnpgDatabases')}?cluster=${item.getName()}&namespace=${item.getNamespace()}`
              )
            }
          />,
          <ActionButton
            key="view-databaseroles"
            description="View Roles"
            icon="mdi:account-key-outline"
            onClick={() =>
              history.push(
                `${createRouteURL('CnpgDatabaseRoles')}?cluster=${item.getName()}&namespace=${item.getNamespace()}`
              )
            }
          />,
          <ActionButton
            key="view-backups"
            description="View Backups"
            icon="mdi:backup-restore"
            onClick={() =>
              history.push(
                `${createRouteURL('CnpgBackups')}?cluster=${item.getName()}&namespace=${item.getNamespace()}`
              )
            }
          />,
          <ActionButton
            key="view-scheduled-backups"
            description="View Scheduled Backups"
            icon="mdi:calendar-clock"
            onClick={() =>
              history.push(
                `${createRouteURL('CnpgScheduledBackups')}?cluster=${item.getName()}&namespace=${item.getNamespace()}`
              )
            }
          />,
        ]
      }
      extraInfo={item =>
        item && [
          {
            name: 'Health',
            value: <StatusLabel status={item.health}>{item.healthLabel}</StatusLabel>,
          },
          {
            name: 'Phase',
            value: item.phase,
          },
          {
            name: 'Current Primary',
            value: item.currentPrimary,
          },
          {
            name: 'Target Primary',
            value: item.targetPrimary,
          },
          {
            name: 'Primary Since',
            value: item.currentPrimaryTimestamp && (
              <DateLabel date={item.currentPrimaryTimestamp} format="mini" />
            ),
          },
          {
            name: 'Instances',
            value: `${item.readyInstances} ready / ${item.instances} total`,
          },
          {
            name: 'Timeline',
            value: item.timelineID?.toString(),
          },
          {
            name: 'PostgreSQL Image',
            value: item.image,
          },
          {
            name: 'System ID',
            value: item.systemID,
          },
          {
            name: 'Synchronous Replication',
            value:
              item.instances > 1 && !item.hasSynchronousReplication ? (
                <StatusLabel status="warning">
                  Off — multiple instances without synchronous replication risk data loss on
                  failover
                </StatusLabel>
              ) : item.hasSynchronousReplication ? (
                <StatusLabel status="success">
                  On ({item.syncReplicasRequired} required)
                </StatusLabel>
              ) : (
                'N/A (single instance)'
              ),
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'instances',
            section: <InstancesSection cluster={item} />,
          },
          {
            id: 'jobs',
            section: <JobsSection cluster={item} />,
          },
          {
            id: 'storage',
            section: <PvcsSection cluster={item} />,
          },
          {
            id: 'poolers',
            section: <PoolersSection cluster={item} />,
          },
          {
            id: 'conditions',
            section: (
              <SectionBox title="Conditions">
                <ConditionsTable resource={item.jsonData} />
              </SectionBox>
            ),
          },
        ]
      }
    />
  );
}
