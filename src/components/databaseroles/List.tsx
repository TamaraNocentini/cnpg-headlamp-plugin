import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { DatabaseRole } from '../../resources/databaseRole';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
import { launchDatabaseRoleCreate } from './Create';

const { createRouteURL } = Router;

export function DatabaseRoleAppliedLabel({ databaseRole }: { databaseRole: DatabaseRole }) {
  if (databaseRole.applied === true) {
    return <StatusLabel status="success">Applied</StatusLabel>;
  }
  if (databaseRole.applied === false) {
    return <StatusLabel status="error">{databaseRole.message ?? 'Not applied'}</StatusLabel>;
  }
  return <StatusLabel status="">Unknown</StatusLabel>;
}

function databaseRoleColumns(): any[] {
  return [
    'name',
    'namespace',
    {
      id: 'cluster',
      label: 'Cluster',
      getValue: (item: DatabaseRole) => item.clusterName,
    },
    {
      id: 'pgName',
      label: 'PG Name',
      getValue: (item: DatabaseRole) => item.pgName,
    },
    {
      id: 'login',
      label: 'Login',
      getValue: (item: DatabaseRole) => (item.login ? 'Yes' : 'No'),
    },
    {
      id: 'superuser',
      label: 'Superuser',
      getValue: (item: DatabaseRole) => (item.superuser ? 'Yes' : 'No'),
    },
    {
      id: 'ensure',
      label: 'Ensure',
      getValue: (item: DatabaseRole) => item.ensure,
    },
    {
      id: 'applied',
      label: 'Status',
      getValue: (item: DatabaseRole) => (item.applied ? 'Applied' : item.message ?? 'Unknown'),
      render: (item: DatabaseRole) => <DatabaseRoleAppliedLabel databaseRole={item} />,
    },
    'age',
  ];
}

export function DatabaseRolesList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clusterFilter = params.get('cluster');
  const namespaceFilter = params.get('namespace');

  // "View Roles" on the Cluster detail page links here with ?cluster=&namespace= to
  // pre-filter — same client-side-filter approach as DatabasesList, since DatabaseRole has no
  // label back to its cluster.
  const [allDatabaseRoles] = DatabaseRole.useList({
    namespace: namespaceFilter ?? undefined,
  });
  const filteredDatabaseRoles = clusterFilter
    ? (allDatabaseRoles ?? []).filter(item => item.clusterName === clusterFilter)
    : null;

  const headerProps = {
    // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
    // title whenever resourceClass is set and titleSideActions isn't — suppress it here since
    // our guided create form below already covers that slot via actions.
    titleSideActions: [],
    actions: [
      <AuthDisabledButton
        key="create-databaserole"
        item={DatabaseRole}
        authVerb="create"
        deniedMessage="You don't have permission to create DatabaseRoles."
      >
        <Button variant="contained" color="primary" onClick={() => launchDatabaseRoleCreate()}>
          Create Role
        </Button>
      </AuthDisabledButton>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Roles for ${clusterFilter}`}
        backLink={createRouteURL('CNPG Cluster', {
          namespace: namespaceFilter,
          name: clusterFilter,
        })}
        data={filteredDatabaseRoles}
        headerProps={headerProps}
        columns={databaseRoleColumns()}
      />
    );
  }

  return (
    <ResourceListView
      title="Roles"
      resourceClass={DatabaseRole}
      headerProps={headerProps}
      columns={databaseRoleColumns()}
    />
  );
}
