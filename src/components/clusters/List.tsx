import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Cluster } from '../../resources/cluster';

export function ClustersList() {
  return (
    <ResourceListView
      title="Clusters"
      resourceClass={Cluster}
      columns={[
        'name',
        'namespace',
        {
          id: 'health',
          label: 'Health',
          getValue: item => item.healthLabel,
          render: item => <StatusLabel status={item.health}>{item.healthLabel}</StatusLabel>,
        },
        {
          id: 'phase',
          label: 'Phase',
          getValue: item => item.phase ?? '',
        },
        {
          id: 'primary',
          label: 'Primary',
          getValue: item => item.currentPrimary ?? '',
        },
        {
          id: 'instances',
          label: 'Instances',
          getValue: item => `${item.readyInstances}/${item.instances}`,
        },
        {
          id: 'synchronousReplication',
          label: 'Sync Replication',
          getValue: item => (item.hasSynchronousReplication ? 'Yes' : 'No'),
          render: item =>
            item.instances > 1 && !item.hasSynchronousReplication ? (
              <StatusLabel status="warning">Off</StatusLabel>
            ) : item.hasSynchronousReplication ? (
              <StatusLabel status="success">On</StatusLabel>
            ) : (
              'N/A'
            ),
        },
        'age',
      ]}
    />
  );
}
