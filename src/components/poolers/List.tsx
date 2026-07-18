import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { Pooler } from '../../resources/pooler';
import { launchPoolerCreate } from './Create';

export function PoolerStatusLabel({ pooler }: { pooler: Pooler }) {
  if (pooler.isPaused) {
    return <StatusLabel status="warning">Paused</StatusLabel>;
  }
  if (pooler.phase === 'active') {
    return <StatusLabel status="success">{pooler.phase}</StatusLabel>;
  }
  return <StatusLabel status="">{pooler.phase ?? '-'}</StatusLabel>;
}

export function PoolersList() {
  return (
    <ResourceListView
      title="Poolers"
      resourceClass={Pooler}
      headerProps={{
        actions: [
          <Button
            key="create-pooler"
            variant="contained"
            color="primary"
            onClick={() => launchPoolerCreate()}
          >
            Create Pooler
          </Button>,
        ],
      }}
      columns={[
        'name',
        'namespace',
        {
          id: 'cluster',
          label: 'Cluster',
          getValue: item => item.clusterName,
        },
        {
          id: 'type',
          label: 'Type',
          getValue: item => item.type,
        },
        {
          id: 'poolMode',
          label: 'Pool Mode',
          getValue: item => item.poolMode ?? '-',
        },
        {
          id: 'instances',
          label: 'Instances',
          getValue: item => item.instances,
        },
        {
          id: 'status',
          label: 'Status',
          getValue: item => (item.isPaused ? 'Paused' : item.phase ?? ''),
          render: item => <PoolerStatusLabel pooler={item} />,
        },
        'age',
      ]}
    />
  );
}
