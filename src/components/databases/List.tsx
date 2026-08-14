import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { Database } from '../../resources/database';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
import { launchDatabaseCreate } from './Create';

const { createRouteURL } = Router;

export function DatabaseAppliedLabel({ database }: { database: Database }) {
  if (database.applied === true) {
    return <StatusLabel status="success">Applied</StatusLabel>;
  }
  if (database.applied === false) {
    return <StatusLabel status="error">{database.message ?? 'Not applied'}</StatusLabel>;
  }
  return <StatusLabel status="">Unknown</StatusLabel>;
}

function databaseColumns(): any[] {
  return [
    'name',
    'namespace',
    {
      id: 'cluster',
      label: 'Cluster',
      getValue: (item: Database) => item.clusterName,
    },
    {
      id: 'pgName',
      label: 'PG Name',
      getValue: (item: Database) => item.pgName,
    },
    {
      id: 'owner',
      label: 'Owner',
      getValue: (item: Database) => item.owner,
    },
    {
      id: 'ensure',
      label: 'Ensure',
      getValue: (item: Database) => item.ensure,
    },
    {
      id: 'applied',
      label: 'Status',
      getValue: (item: Database) => (item.applied ? 'Applied' : item.message ?? 'Unknown'),
      render: (item: Database) => <DatabaseAppliedLabel database={item} />,
    },
    'age',
  ];
}

export function DatabasesList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clusterFilter = params.get('cluster');
  const namespaceFilter = params.get('namespace');

  // "View Databases" on the Cluster detail page links here with ?cluster=&namespace= to
  // pre-filter — same client-side-filter approach as ScheduledBackupsList, since Database has no
  // label back to its cluster.
  const [allDatabases] = Database.useList({
    namespace: namespaceFilter ?? undefined,
  });
  const filteredDatabases = clusterFilter
    ? (allDatabases ?? []).filter(item => item.clusterName === clusterFilter)
    : null;

  const headerProps = {
    // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
    // title whenever resourceClass is set and titleSideActions isn't — suppress it here since
    // our guided create form below already covers that slot via actions.
    titleSideActions: [],
    actions: [
      <AuthDisabledButton
        key="create-database"
        item={Database}
        authVerb="create"
        deniedMessage="You don't have permission to create Databases."
      >
        <Button variant="contained" color="primary" onClick={() => launchDatabaseCreate()}>
          Create Database
        </Button>
      </AuthDisabledButton>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Databases for ${clusterFilter}`}
        backLink={createRouteURL('CNPG Cluster', {
          namespace: namespaceFilter,
          name: clusterFilter,
        })}
        data={filteredDatabases}
        headerProps={headerProps}
        columns={databaseColumns()}
      />
    );
  }

  return (
    <ResourceListView
      title="Databases"
      resourceClass={Database}
      headerProps={headerProps}
      columns={databaseColumns()}
    />
  );
}
