import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { ImageCatalog } from '../../resources/imageCatalog';
import { launchImageCatalogCreate } from './Create';

export function ImageCatalogsList() {
  return (
    <ResourceListView
      title="ImageCatalogs"
      resourceClass={ImageCatalog}
      headerProps={{
        actions: [
          <Button
            key="create-imagecatalog"
            variant="contained"
            color="primary"
            onClick={() => launchImageCatalogCreate()}
          >
            Create ImageCatalog
          </Button>,
        ],
      }}
      columns={[
        'name',
        'namespace',
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
