import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import { ObjectStore } from '../../resources/objectStore';
import { launchObjectStoreCreate } from './Create';

export function ObjectStoresList() {
  return (
    <ResourceListView
      title="ObjectStores"
      resourceClass={ObjectStore}
      headerProps={{
        // ResourceListView auto-injects Headlamp's own generic CreateResourceButton next to the
        // title whenever resourceClass is set and titleSideActions isn't — suppress it here
        // since our guided create form below already covers that slot via actions.
        titleSideActions: [],
        actions: [
          <Button
            key="create-objectstore"
            variant="contained"
            color="primary"
            onClick={() => launchObjectStoreCreate()}
          >
            Create ObjectStore
          </Button>,
        ],
      }}
      columns={[
        'name',
        'namespace',
        {
          id: 'destinationPath',
          label: 'Destination Path',
          getValue: item => item.destinationPath,
        },
        {
          id: 'endpointURL',
          label: 'Endpoint URL',
          getValue: item => item.endpointURL ?? '-',
        },
        {
          id: 'retentionPolicy',
          label: 'Retention Policy',
          getValue: item => item.retentionPolicy ?? '-',
        },
        'age',
      ]}
    />
  );
}
