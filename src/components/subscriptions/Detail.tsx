import {
  DetailsGrid,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Subscription } from '../../resources/subscription';
import { SubscriptionAppliedLabel } from './List';

function ParametersSection({ subscription }: { subscription: Subscription }) {
  const entries = Object.entries(subscription.parameters);
  if (entries.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Parameters">
      <SimpleTable
        columns={[
          { label: 'Name', getter: ([name]: [string, string]) => name },
          { label: 'Value', getter: ([, value]: [string, string]) => value },
        ]}
        data={entries}
      />
    </SectionBox>
  );
}

export function SubscriptionDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={Subscription}
      name={name}
      namespace={namespace}
      extraInfo={item =>
        item && [
          {
            name: 'Cluster (Subscriber)',
            value: item.clusterName,
          },
          {
            name: 'PG Name',
            value: item.pgName,
          },
          {
            name: 'Database',
            value: item.dbname,
          },
          {
            name: 'Publication',
            value: item.publicationName,
          },
          {
            name: 'Publication Database',
            value: item.publicationDBName,
          },
          {
            name: 'Publisher (External Cluster)',
            value: item.externalClusterName,
          },
          {
            name: 'Status',
            value: <SubscriptionAppliedLabel subscription={item} />,
          },
          {
            name: 'Reclaim Policy',
            value: item.reclaimPolicy,
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'parameters',
            section: <ParametersSection subscription={item} />,
          },
        ]
      }
    />
  );
}
