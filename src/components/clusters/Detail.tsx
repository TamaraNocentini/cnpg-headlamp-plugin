import { K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  ConditionsTable,
  DetailsGrid,
  ResourceLink,
  SectionBox,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';

type Pod = InstanceType<typeof K8s.ResourceClasses.Pod>;

function InstanceRoleLabel({ pod }: { pod: Pod }) {
  const role = pod.metadata.labels?.['cnpg.io/instanceRole'];
  switch (role) {
    case 'primary':
      return <StatusLabel status="success">primary</StatusLabel>;
    case 'replica':
      return <StatusLabel status="">replica</StatusLabel>;
    case 'unhealthy':
      return <StatusLabel status="error">unhealthy</StatusLabel>;
    default:
      return <>{role ?? '-'}</>;
  }
}

function InstancesSection({ cluster }: { cluster: Cluster }) {
  const [pods] = K8s.ResourceClasses.Pod.useList({
    namespace: cluster.getNamespace(),
    labelSelector: `cnpg.io/cluster=${cluster.getName()}`,
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
            label: 'Ready',
            getter: (pod: Pod) =>
              pod.status.containerStatuses?.every(container => container.ready) ? 'Yes' : 'No',
          },
          {
            label: 'Phase',
            getter: (pod: Pod) => pod.status.phase,
          },
        ]}
        data={pods ?? []}
      />
    </SectionBox>
  );
}

export function ClusterDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={Cluster}
      name={name}
      namespace={namespace}
      withEvents
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
            value: item.isSwitchoverInProgress ? item.targetPrimary : undefined,
          },
          {
            name: 'Instances',
            value: `${item.readyInstances} ready / ${item.instances} total`,
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
                `On (${item.syncReplicasRequired} required)`
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
