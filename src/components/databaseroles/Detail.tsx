import {
  ConditionsTable,
  DateLabel,
  DetailsGrid,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { DatabaseRole } from '../../resources/databaseRole';
import { DatabaseRoleAppliedLabel } from './List';

function AttributesSection({ databaseRole }: { databaseRole: DatabaseRole }) {
  return (
    <SectionBox title="Attributes">
      <SimpleTable
        columns={[
          { label: 'Attribute', getter: (row: [string, boolean]) => row[0] },
          {
            label: 'Value',
            getter: (row: [string, boolean]) => (row[1] ? 'Yes' : 'No'),
          },
        ]}
        data={[
          ['Login', databaseRole.login],
          ['Superuser', databaseRole.superuser],
          ['Create DB', databaseRole.createdb],
          ['Create Role', databaseRole.createrole],
          ['Inherit', databaseRole.inherit],
          ['Replication', databaseRole.replication],
          ['Bypass RLS', databaseRole.bypassrls],
        ]}
      />
    </SectionBox>
  );
}

function ClientCertificateSection({ databaseRole }: { databaseRole: DatabaseRole }) {
  if (!databaseRole.clientCertificateEnabled) {
    return null;
  }

  const status = databaseRole.clientCertificateStatus;

  return (
    <SectionBox title="Client Certificate">
      <SimpleTable
        columns={[
          { label: 'Field', getter: (row: [string, string]) => row[0] },
          { label: 'Value', getter: (row: [string, string]) => row[1] },
        ]}
        data={[
          ['Expiration', status?.expiration ?? '-'],
          ['Message', status?.message ?? '-'],
        ]}
      />
    </SectionBox>
  );
}

export function DatabaseRoleDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={DatabaseRole}
      name={name}
      namespace={namespace}
      extraInfo={item =>
        item && [
          {
            name: 'Cluster',
            value: item.clusterName,
          },
          {
            name: 'PG Name',
            value: item.pgName,
          },
          {
            name: 'Ensure',
            value: item.ensure,
          },
          {
            name: 'Status',
            value: <DatabaseRoleAppliedLabel databaseRole={item} />,
          },
          {
            name: 'Comment',
            value: item.comment,
          },
          {
            name: 'Connection Limit',
            value: item.connectionLimit === -1 ? 'No limit' : item.connectionLimit.toString(),
          },
          {
            name: 'Valid Until',
            value: item.validUntil && <DateLabel date={item.validUntil} format="mini" />,
          },
          {
            name: 'In Roles',
            value: item.inRoles.length > 0 ? item.inRoles.join(', ') : undefined,
          },
          {
            name: 'Password',
            value: item.disablePassword ? 'Disabled' : item.passwordSecretName ?? 'Not set',
          },
          {
            name: 'Reclaim Policy',
            value: item.databaseRoleReclaimPolicy,
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'attributes',
            section: <AttributesSection databaseRole={item} />,
          },
          {
            id: 'client-certificate',
            section: <ClientCertificateSection databaseRole={item} />,
          },
          {
            id: 'conditions',
            section: item.status.conditions && item.status.conditions.length > 0 && (
              <SectionBox title="Conditions">
                <ConditionsTable resource={item.jsonData} />
              </SectionBox>
            ),
          },
        ]
      }
    />
  );
}
