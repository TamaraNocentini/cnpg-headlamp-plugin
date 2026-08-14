import { K8s, Router } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import { useHistory } from 'react-router-dom';

const { createRouteURL } = Router;

// Full name of the Barman Cloud plugin's ObjectStore CRD, as it appears in
// CustomResourceDefinition.metadata.name. Kept in one place since both this check and
// OperatorStatus's CRD_GROUPS list need to recognize the same CRD.
const BARMAN_CLOUD_OBJECTSTORE_CRD = 'objectstores.barmancloud.cnpg.io';

/** Whether the Barman Cloud plugin's ObjectStore CRD is installed on the cluster. `null` while
 *  the CustomResourceDefinition list is still loading — callers should treat that the same as
 *  "assume installed" so pages don't flash a false "not installed" state before the check
 *  resolves. */
export function useBarmanCloudCrdInstalled(): boolean | null {
  const [crds] = K8s.ResourceClasses.CustomResourceDefinition.useList();
  if (crds === null) {
    return null;
  }
  return crds.some(crd => crd.getName() === BARMAN_CLOUD_OBJECTSTORE_CRD);
}

/** Shown by the ObjectStores views instead of an empty/broken list when the Barman Cloud
 *  plugin's ObjectStore CRD isn't installed — ObjectStore.useList() has nothing to query
 *  otherwise, since the CRD it targets doesn't exist on the cluster. */
export function BarmanCloudNotInstalled({ title }: { title: string }) {
  const history = useHistory();

  return (
    <SectionBox title={title}>
      <Alert
        severity="warning"
        action={
          <Link
            component="button"
            color="inherit"
            underline="always"
            sx={{ mr: 1 }}
            onClick={() => history.push(createRouteURL('CNPG Status'))}
          >
            Operator status
          </Link>
        }
      >
        <AlertTitle>Barman Cloud plugin not installed</AlertTitle>
        ObjectStore is one of its CRDs, not a core CloudNativePG resource.
      </Alert>
    </SectionBox>
  );
}
