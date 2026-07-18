import {
  ConditionsTable,
  DetailsGrid,
  SectionBox,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';

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
