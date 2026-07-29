import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { Publication } from '../../resources/publication';
import { launchPublicationCreate } from './Create';

const { createRouteURL } = Router;

export function PublicationAppliedLabel({ publication }: { publication: Publication }) {
  if (publication.applied === true) {
    return <StatusLabel status="success">Applied</StatusLabel>;
  }
  if (publication.applied === false) {
    return <StatusLabel status="error">{publication.message ?? 'Not applied'}</StatusLabel>;
  }
  return <StatusLabel status="">Unknown</StatusLabel>;
}

export function PublicationTargetSummary({ publication }: { publication: Publication }) {
  if (publication.isAllTables) {
    return <>All Tables</>;
  }
  const count = publication.objects.length;
  return (
    <>
      {count} object{count === 1 ? '' : 's'}
    </>
  );
}

function publicationColumns(): any[] {
  return [
    'name',
    'namespace',
    {
      id: 'cluster',
      label: 'Cluster',
      getValue: (item: Publication) => item.clusterName,
    },
    {
      id: 'pgName',
      label: 'PG Name',
      getValue: (item: Publication) => item.pgName,
    },
    {
      id: 'dbname',
      label: 'Database',
      getValue: (item: Publication) => item.dbname,
    },
    {
      id: 'target',
      label: 'Target',
      getValue: (item: Publication) =>
        item.isAllTables ? 'All Tables' : `${item.objects.length} objects`,
      render: (item: Publication) => <PublicationTargetSummary publication={item} />,
    },
    {
      id: 'applied',
      label: 'Status',
      getValue: (item: Publication) => (item.applied ? 'Applied' : item.message ?? 'Unknown'),
      render: (item: Publication) => <PublicationAppliedLabel publication={item} />,
    },
    'age',
  ];
}

export function PublicationsList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clusterFilter = params.get('cluster');
  const namespaceFilter = params.get('namespace');

  // "View Publications" on the Cluster detail page links here with ?cluster=&namespace= to
  // pre-filter — same client-side-filter approach as DatabasesList, since Publication has no
  // label back to its cluster.
  const [allPublications] = Publication.useList({
    namespace: namespaceFilter ?? undefined,
  });
  const filteredPublications = clusterFilter
    ? (allPublications ?? []).filter(item => item.clusterName === clusterFilter)
    : null;

  const headerProps = {
    actions: [
      <Button
        key="create-publication"
        variant="contained"
        color="primary"
        onClick={() => launchPublicationCreate()}
      >
        Create Publication
      </Button>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Publications for ${clusterFilter}`}
        backLink={createRouteURL('CnpgClusterDetail', {
          namespace: namespaceFilter,
          name: clusterFilter,
        })}
        data={filteredPublications}
        headerProps={headerProps}
        columns={publicationColumns()}
      />
    );
  }

  return (
    <ResourceListView
      title="Publications"
      resourceClass={Publication}
      headerProps={headerProps}
      columns={publicationColumns()}
    />
  );
}
