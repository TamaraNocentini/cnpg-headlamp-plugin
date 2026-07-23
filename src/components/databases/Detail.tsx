import {
  DetailsGrid,
  SectionBox,
  SimpleTable,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Database, DatabaseObjectStatus } from '../../resources/database';
import { DatabaseAppliedLabel } from './List';

function ObjectAppliedLabel({ status }: { status?: DatabaseObjectStatus }) {
  if (!status) {
    return <StatusLabel status="">Unknown</StatusLabel>;
  }
  return status.applied ? (
    <StatusLabel status="success">Applied</StatusLabel>
  ) : (
    <StatusLabel status="error">{status.message ?? 'Not applied'}</StatusLabel>
  );
}

function SchemasSection({ database }: { database: Database }) {
  if (database.schemas.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Schemas">
      <SimpleTable
        columns={[
          { label: 'Name', getter: schema => schema.name },
          { label: 'Owner', getter: schema => schema.owner ?? '-' },
          { label: 'Ensure', getter: schema => schema.ensure ?? 'present' },
          {
            label: 'Status',
            getter: schema => <ObjectAppliedLabel status={database.getSchemaStatus(schema.name)} />,
          },
        ]}
        data={database.schemas}
      />
    </SectionBox>
  );
}

function ExtensionsSection({ database }: { database: Database }) {
  if (database.extensions.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Extensions">
      <SimpleTable
        columns={[
          { label: 'Name', getter: extension => extension.name },
          { label: 'Version', getter: extension => extension.version ?? '-' },
          { label: 'Schema', getter: extension => extension.schema ?? '-' },
          { label: 'Ensure', getter: extension => extension.ensure ?? 'present' },
          {
            label: 'Status',
            getter: extension => (
              <ObjectAppliedLabel status={database.getExtensionStatus(extension.name)} />
            ),
          },
        ]}
        data={database.extensions}
      />
    </SectionBox>
  );
}

function FDWsSection({ database }: { database: Database }) {
  if (database.fdws.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Foreign Data Wrappers">
      <SimpleTable
        columns={[
          { label: 'Name', getter: fdw => fdw.name },
          { label: 'Handler', getter: fdw => fdw.handler ?? '-' },
          { label: 'Validator', getter: fdw => fdw.validator ?? '-' },
          { label: 'Owner', getter: fdw => fdw.owner ?? '-' },
          { label: 'Ensure', getter: fdw => fdw.ensure ?? 'present' },
          {
            label: 'Status',
            getter: fdw => <ObjectAppliedLabel status={database.getFDWStatus(fdw.name)} />,
          },
        ]}
        data={database.fdws}
      />
    </SectionBox>
  );
}

function ServersSection({ database }: { database: Database }) {
  if (database.servers.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Foreign Servers">
      <SimpleTable
        columns={[
          { label: 'Name', getter: server => server.name },
          { label: 'FDW', getter: server => server.fdw },
          { label: 'Ensure', getter: server => server.ensure ?? 'present' },
          {
            label: 'Status',
            getter: server => <ObjectAppliedLabel status={database.getServerStatus(server.name)} />,
          },
        ]}
        data={database.servers}
      />
    </SectionBox>
  );
}

export function DatabaseDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={Database}
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
            name: 'Owner',
            value: item.owner,
          },
          {
            name: 'Ensure',
            value: item.ensure,
          },
          {
            name: 'Status',
            value: <DatabaseAppliedLabel database={item} />,
          },
          {
            name: 'Template',
            value: item.template,
          },
          {
            name: 'Encoding',
            value: item.encoding,
          },
          {
            name: 'Locale Provider',
            value: item.localeProvider,
          },
          {
            name: 'Tablespace',
            value: item.tablespace,
          },
          {
            name: 'Reclaim Policy',
            value: item.databaseReclaimPolicy,
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'schemas',
            section: <SchemasSection database={item} />,
          },
          {
            id: 'extensions',
            section: <ExtensionsSection database={item} />,
          },
          {
            id: 'fdws',
            section: <FDWsSection database={item} />,
          },
          {
            id: 'servers',
            section: <ServersSection database={item} />,
          },
        ]
      }
    />
  );
}
