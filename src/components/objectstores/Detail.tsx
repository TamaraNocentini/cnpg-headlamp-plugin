import {
  DetailsGrid,
  ResourceLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { ObjectStore } from '../../resources/objectStore';

function ReferringClustersSection({ objectStore }: { objectStore: ObjectStore }) {
  // Clusters reference an ObjectStore by name in spec.plugins[]/spec.externalClusters[] rather
  // than a label, so we fetch every Cluster in the namespace and filter client-side — same
  // pattern as PoolersSection in clusters/Detail.tsx.
  const [allClusters] = Cluster.useList({ namespace: objectStore.getNamespace() });
  const referringClusters = allClusters?.filter(
    cluster =>
      cluster.referencesObjectStoreAsBackup(objectStore.getName()) ||
      cluster.referencesObjectStoreAsRecoverySource(objectStore.getName())
  );

  if (referringClusters && referringClusters.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Referring Clusters">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            // ResourceLink defaults its route lookup to resource.kind ('Cluster'), but our route
            // is registered as 'CnpgClusterDetail' (see index.tsx) to dodge a naming collision —
            // so the default lookup fails silently and needs this explicit override, same as
            // PoolersSection in clusters/Detail.tsx.
            getter: (cluster: Cluster) => (
              <ResourceLink resource={cluster} routeName="CnpgClusterDetail" />
            ),
          },
          {
            label: 'Backup Destination',
            getter: (cluster: Cluster) =>
              cluster.referencesObjectStoreAsBackup(objectStore.getName()) ? 'Yes' : '-',
          },
          {
            label: 'Recovery Source',
            getter: (cluster: Cluster) =>
              cluster.referencesObjectStoreAsRecoverySource(objectStore.getName()) ? 'Yes' : '-',
          },
        ]}
        data={referringClusters ?? []}
      />
    </SectionBox>
  );
}

export function ObjectStoreDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={ObjectStore}
      name={name}
      namespace={namespace}
      extraInfo={item =>
        item && [
          {
            name: 'Destination Path',
            value: item.destinationPath,
          },
          {
            name: 'Endpoint URL',
            value: item.endpointURL,
          },
          {
            name: 'Retention Policy',
            value: item.retentionPolicy,
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'referring-clusters',
            section: <ReferringClustersSection objectStore={item} />,
          },
        ]
      }
    />
  );
}
