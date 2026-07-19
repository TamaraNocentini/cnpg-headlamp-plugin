import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { Cluster } from '../../resources/cluster';
import { launchClusterCreate } from './Create';

export function ClustersList() {
  return (
    <ResourceListView
      title="Clusters"
      resourceClass={Cluster}
      headerProps={{
        actions: [
          <Button
            key="create-cluster"
            variant="contained"
            color="primary"
            onClick={() => launchClusterCreate()}
          >
            Create Cluster
          </Button>,
        ],
      }}
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
