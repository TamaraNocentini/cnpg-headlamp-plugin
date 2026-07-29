import {
  DetailsGrid,
  ResourceLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { ClusterImageCatalog } from '../../resources/imageCatalog';

function ImagesSection({ imageCatalog }: { imageCatalog: ClusterImageCatalog }) {
  return (
    <SectionBox title="Images">
      <SimpleTable
        columns={[
          { label: 'Major Version', getter: image => image.major },
          { label: 'Image', getter: image => image.image },
        ]}
        data={imageCatalog.images}
      />
    </SectionBox>
  );
}

function ReferringClustersSection({ imageCatalog }: { imageCatalog: ClusterImageCatalog }) {
  // ClusterImageCatalog is cluster-scoped, so — unlike the namespaced ImageCatalog's equivalent
  // section — Clusters in any namespace may reference it, so we fetch across all namespaces.
  const [allClusters] = Cluster.useList();
  const referringClusters = allClusters?.filter(cluster =>
    cluster.referencesImageCatalog('ClusterImageCatalog', imageCatalog.getName())
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
            getter: (cluster: Cluster) => (
              <ResourceLink resource={cluster} routeName="CNPG Cluster" />
            ),
          },
          {
            label: 'Namespace',
            getter: (cluster: Cluster) => cluster.getNamespace(),
          },
          {
            label: 'Major Version',
            getter: (cluster: Cluster) => cluster.imageCatalogRef?.major ?? '-',
          },
        ]}
        data={referringClusters ?? []}
      />
    </SectionBox>
  );
}

export function ClusterImageCatalogDetail() {
  const { name } = useParams<{ name: string }>();

  return (
    <DetailsGrid
      resourceType={ClusterImageCatalog}
      name={name}
      extraSections={item =>
        item && [
          { id: 'images', section: <ImagesSection imageCatalog={item} /> },
          { id: 'referring-clusters', section: <ReferringClustersSection imageCatalog={item} /> },
        ]
      }
    />
  );
}
