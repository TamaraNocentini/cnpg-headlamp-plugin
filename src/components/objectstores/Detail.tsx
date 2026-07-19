import { DetailsGrid } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { ObjectStore } from '../../resources/objectStore';

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
    />
  );
}
