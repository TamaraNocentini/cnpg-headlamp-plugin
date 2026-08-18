import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useLocation } from 'react-router-dom';
import { Backup } from '../../resources/backup';
import { backupPhaseSeverity } from '../../resources/status';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
import { launchBackupCreate } from './Create';

const { createRouteURL } = Router;

export function BackupPhaseLabel({ backup }: { backup: Backup }) {
  const phase = backup.phase;
  const label = backupPhaseStatusLabel(phase);
  // CNPG's own `kubectl get backups` prints an Error column next to Phase, because a bare "failed"
  // chip gives an operator nothing to act on. Surface that same text on hover rather than making
  // them open the detail page to find out why. Mirrors DatabaseAppliedLabel, which already inlines
  // status.message on failure.
  if (backup.error) {
    return (
      <Tooltip title={backup.error}>
        <span>{label}</span>
      </Tooltip>
    );
  }
  return label;
}

function backupPhaseStatusLabel(phase: string | undefined) {
  return <StatusLabel status={backupPhaseSeverity(phase)}>{phase ?? '-'}</StatusLabel>;
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
