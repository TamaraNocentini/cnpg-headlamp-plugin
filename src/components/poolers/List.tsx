import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { Pooler } from '../../resources/pooler';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
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
        // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
        // title whenever resourceClass is set and titleSideActions isn't — suppress it here
        // since our guided create form below already covers that slot via actions.
        titleSideActions: [],
        actions: [
          <AuthDisabledButton
            key="create-pooler"
            item={Pooler}
            authVerb="create"
            deniedMessage="You don't have permission to create Poolers."
          >
            <Button variant="contained" color="primary" onClick={() => launchPoolerCreate()}>
              Create Pooler
            </Button>
          </AuthDisabledButton>,
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
