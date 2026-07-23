import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { DatabaseRole } from '../../resources/databaseRole';
import { launchDatabaseRoleCreate } from './Create';

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
    actions: [
      <Button
        key="create-databaserole"
        variant="contained"
        color="primary"
        onClick={() => launchDatabaseRoleCreate()}
      >
        Create Role
      </Button>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Roles for ${clusterFilter}`}
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
