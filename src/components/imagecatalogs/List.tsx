import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { ImageCatalog } from '../../resources/imageCatalog';
import { AuthDisabledButton } from '../common/AuthDisabledButton';
import { launchImageCatalogCreate } from './Create';

export function ImageCatalogsList() {
  return (
    <ResourceListView
      title="ImageCatalogs"
      resourceClass={ImageCatalog}
      headerProps={{
        // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
        // title whenever resourceClass is set and titleSideActions isn't — suppress it here
        // since our guided create form below already covers that slot via actions.
        titleSideActions: [],
        actions: [
          <AuthDisabledButton
            key="create-imagecatalog"
            item={ImageCatalog}
            authVerb="create"
            deniedMessage="You don't have permission to create ImageCatalogs."
          >
            <Button variant="contained" color="primary" onClick={() => launchImageCatalogCreate()}>
              Create ImageCatalog
            </Button>
          </AuthDisabledButton>,
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
