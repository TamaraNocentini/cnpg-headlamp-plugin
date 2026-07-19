import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  Loader,
  NameValueTable,
  SecretField,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Cluster } from '../../resources/cluster';

// The operator provisions one Secret per bootstrapped role (app, superuser, ...); the "app" user
// is the one applications are meant to connect with, and its Secret is always named this way.
function appSecretName(cluster: Cluster): string {
  return `${cluster.getName()}-app`;
}

function decode(value?: string): string {
  return value ? atob(value) : '-';
}

function ConnectionInfo({ cluster }: { cluster: Cluster }) {
  const secretName = appSecretName(cluster);
  const [secret, error] = K8s.ResourceClasses.Secret.useGet(secretName, cluster.getNamespace(), {
    cluster: cluster.cluster,
  });

  if (error) {
    return (
      <SectionBox title="Connect">
        Could not find secret <code>{secretName}</code> in namespace{' '}
        <code>{cluster.getNamespace()}</code>. The "app" user secret is only created for clusters
        using the default CNPG bootstrap; clusters bootstrapped without an "app" user won't have
        one.
      </SectionBox>
    );
  }

  if (!secret) {
    return <Loader title="Loading connection info" />;
  }

  const data = secret.jsonData.data ?? {};

  return (
    <SectionBox title="Connect to cluster">
      <NameValueTable
        rows={[
          { name: 'Host', value: decode(data.host) },
          { name: 'Port', value: decode(data.port) },
          { name: 'Database', value: decode(data.dbname) },
          { name: 'Username', value: decode(data.username) },
          {
            name: 'Password',
            value: <SecretField value={data.password} nameID="cnpg-connect-password" />,
          },
          {
            name: 'Connection URI',
            value: <SecretField value={data.uri} nameID="cnpg-connect-uri" />,
          },
          {
            name: 'JDBC URI',
            value: <SecretField value={data['jdbc-uri']} nameID="cnpg-connect-jdbc-uri" />,
          },
        ]}
      />
    </SectionBox>
  );
}

export function launchConnectActivity(cluster: Cluster) {
  const activityId = 'cnpg-connect-' + cluster.metadata.uid;
  Activity.launch({
    id: activityId,
    title: `Connect to ${cluster.getName()}`,
    cluster: cluster.cluster,
    icon: <Icon icon="mdi:power-plug-outline" width="100%" height="100%" />,
    location: 'split-right',
    content: <ConnectionInfo cluster={cluster} />,
  });
}
