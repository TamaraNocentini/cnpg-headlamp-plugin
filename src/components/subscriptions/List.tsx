import { Router } from '@kinvolk/headlamp-plugin/lib';
import { ResourceListView, StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { useLocation } from 'react-router-dom';
import { Subscription } from '../../resources/subscription';
import { launchSubscriptionCreate } from './Create';

const { createRouteURL } = Router;

export function SubscriptionAppliedLabel({ subscription }: { subscription: Subscription }) {
  if (subscription.applied === true) {
    return <StatusLabel status="success">Applied</StatusLabel>;
  }
  if (subscription.applied === false) {
    return <StatusLabel status="error">{subscription.message ?? 'Not applied'}</StatusLabel>;
  }
  return <StatusLabel status="">Unknown</StatusLabel>;
}

function subscriptionColumns(): any[] {
  return [
    'name',
    'namespace',
    {
      id: 'cluster',
      label: 'Cluster',
      getValue: (item: Subscription) => item.clusterName,
    },
    {
      id: 'pgName',
      label: 'PG Name',
      getValue: (item: Subscription) => item.pgName,
    },
    {
      id: 'dbname',
      label: 'Database',
      getValue: (item: Subscription) => item.dbname,
    },
    {
      id: 'publication',
      label: 'Publication',
      getValue: (item: Subscription) => item.publicationName,
    },
    {
      id: 'externalCluster',
      label: 'Publisher (External Cluster)',
      getValue: (item: Subscription) => item.externalClusterName,
    },
    {
      id: 'applied',
      label: 'Status',
      getValue: (item: Subscription) => (item.applied ? 'Applied' : item.message ?? 'Unknown'),
      render: (item: Subscription) => <SubscriptionAppliedLabel subscription={item} />,
    },
    'age',
  ];
}

export function SubscriptionsList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clusterFilter = params.get('cluster');
  const namespaceFilter = params.get('namespace');

  // "View Subscriptions" on the Cluster detail page links here with ?cluster=&namespace= to
  // pre-filter — same client-side-filter approach as DatabasesList, since Subscription has no
  // label back to its (subscriber) cluster.
  const [allSubscriptions] = Subscription.useList({
    namespace: namespaceFilter ?? undefined,
  });
  const filteredSubscriptions = clusterFilter
    ? (allSubscriptions ?? []).filter(item => item.clusterName === clusterFilter)
    : null;

  const headerProps = {
    actions: [
      <Button
        key="create-subscription"
        variant="contained"
        color="primary"
        onClick={() => launchSubscriptionCreate()}
      >
        Create Subscription
      </Button>,
    ],
  };

  if (clusterFilter) {
    return (
      <ResourceListView
        title={`Subscriptions for ${clusterFilter}`}
        backLink={createRouteURL('CnpgClusterDetail', {
          namespace: namespaceFilter,
          name: clusterFilter,
        })}
        data={filteredSubscriptions}
        headerProps={headerProps}
        columns={subscriptionColumns()}
      />
    );
  }

  return (
    <ResourceListView
      title="Subscriptions"
      resourceClass={Subscription}
      headerProps={headerProps}
      columns={subscriptionColumns()}
    />
  );
}
