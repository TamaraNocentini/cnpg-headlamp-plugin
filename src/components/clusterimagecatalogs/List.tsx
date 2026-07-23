import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { ClusterImageCatalog } from '../../resources/imageCatalog';
import { launchClusterImageCatalogCreate } from './Create';

export function ClusterImageCatalogsList() {
  return (
    <ResourceListView
      title="ClusterImageCatalogs"
      resourceClass={ClusterImageCatalog}
      headerProps={{
        actions: [
          <Button
            key="create-clusterimagecatalog"
            variant="contained"
            color="primary"
            onClick={() => launchClusterImageCatalogCreate()}
          >
            Create ClusterImageCatalog
          </Button>,
        ],
      }}
      columns={[
        'name',
        {
          id: 'majorVersions',
          label: 'Major Versions',
          getValue: item => item.images.map(image => image.major).join(', ') || '-',
        },
        'age',
      ]}
    />
  );
}
