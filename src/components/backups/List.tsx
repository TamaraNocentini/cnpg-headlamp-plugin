import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { Backup } from '../../resources/backup';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
import { launchBackupCreate } from './Create';

const { createRouteURL } = Router;

export function BackupPhaseLabel({ backup }: { backup: Backup }) {
  const phase = backup.phase;
  switch (phase) {
    case 'completed':
      return <StatusLabel status="success">{phase}</StatusLabel>;
    case 'failed':
    case 'walArchivingFailing':
    case 'invalid backup definition':
      return <StatusLabel status="error">{phase}</StatusLabel>;
    case 'pending':
    case 'started':
    case 'running':
    case 'finalizing':
      return <StatusLabel status="warning">{phase}</StatusLabel>;
    default:
      return <StatusLabel status="">{phase ?? '-'}</StatusLabel>;
  }
}

export function BackupsList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clusterFilter = params.get('cluster');
  const namespaceFilter = params.get('namespace');

  // "View Backups" on the Cluster detail page links here with ?cluster=&namespace= to pre-filter
  // — Backup has no label back to its cluster, so we fetch the namespace's backups and filter
  // client-side, same approach as PoolersSection/ReferringClustersSection.
  const [allBackups] = Backup.useList({ namespace: namespaceFilter ?? undefined });
  const filteredBackups = clusterFilter
    ? (allBackups ?? []).filter(backup => backup.clusterName === clusterFilter)
    : null;

  const headerProps = {
    // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
    // title whenever resourceClass is set and titleSideActions isn't — suppress it here since
    // our guided create form below already covers that slot via actions.
    titleSideActions: [],
    actions: [
      <AuthDisabledButton
        key="create-backup"
        item={Backup}
        authVerb="create"
        deniedMessage="You don't have permission to create Backups."
      >
        <Button variant="contained" color="primary" onClick={() => launchBackupCreate()}>
          Create Backup
        </Button>
      </AuthDisabledButton>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Backups for ${clusterFilter}`}
        backLink={createRouteURL('CNPG Cluster', {
          namespace: namespaceFilter,
          name: clusterFilter,
        })}
        data={filteredBackups}
        headerProps={headerProps}
        columns={[
          'name',
          'namespace',
          {
            id: 'cluster',
            label: 'Cluster',
            getValue: item => item.clusterName,
          },
          {
            id: 'method',
            label: 'Method',
            getValue: item => item.method,
          },
          {
            id: 'phase',
            label: 'Phase',
            getValue: item => item.phase ?? '-',
            render: item => <BackupPhaseLabel backup={item} />,
          },
          'age',
        ]}
      />
    );
  }

  return (
    <ResourceListView
      title="Backups"
      resourceClass={Backup}
      headerProps={headerProps}
      columns={[
        'name',
        'namespace',
        {
          id: 'cluster',
          label: 'Cluster',
          getValue: item => item.clusterName,
        },
        {
          id: 'method',
          label: 'Method',
          getValue: item => item.method,
        },
        {
          id: 'phase',
          label: 'Phase',
          getValue: item => item.phase ?? '-',
          render: item => <BackupPhaseLabel backup={item} />,
        },
        'age',
      ]}
    />
  );
}
