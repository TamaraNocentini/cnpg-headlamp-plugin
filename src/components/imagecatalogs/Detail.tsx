import {
  DetailsGrid,
  ResourceLink,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { ImageCatalog } from '../../resources/imageCatalog';

function ImagesSection({ imageCatalog }: { imageCatalog: ImageCatalog }) {
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

function ReferringClustersSection({ imageCatalog }: { imageCatalog: ImageCatalog }) {
  // Same pattern as ReferringClustersSection in objectstores/Detail.tsx: Clusters reference an
  // ImageCatalog by name in spec.imageCatalogRef rather than a label, so we fetch every Cluster in
  // the namespace (ImageCatalog is namespaced, unlike ClusterImageCatalog) and filter client-side.
  const [allClusters] = Cluster.useList({ namespace: imageCatalog.getNamespace() });
  const referringClusters = allClusters?.filter(cluster =>
    cluster.referencesImageCatalog('ImageCatalog', imageCatalog.getName())
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
            // is registered as 'CnpgClusterDetail' (see index.tsx) — same override as
            // ReferringClustersSection in objectstores/Detail.tsx.
            getter: (cluster: Cluster) => (
              <ResourceLink resource={cluster} routeName="CnpgClusterDetail" />
            ),
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

export function ImageCatalogDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={ImageCatalog}
      name={name}
      namespace={namespace}
      extraSections={item =>
        item && [
          { id: 'images', section: <ImagesSection imageCatalog={item} /> },
          { id: 'referring-clusters', section: <ReferringClustersSection imageCatalog={item} /> },
        ]
      }
    />
  );
}
