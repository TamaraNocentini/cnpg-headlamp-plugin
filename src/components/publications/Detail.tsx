import {
  DetailsGrid,
  SectionBox,
  SimpleTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useParams } from 'react-router-dom';
import { Publication, PublicationTargetObject } from '../../resources/publication';
import { PublicationAppliedLabel } from './List';

function describeObject(object: PublicationTargetObject): string {
  if (object.tablesInSchema) {
    return `All tables in schema "${object.tablesInSchema}"`;
  }
  if (object.table) {
    const qualifiedName = object.table.schema
      ? `${object.table.schema}.${object.table.name}`
      : object.table.name;
    return object.table.only ? `${qualifiedName} (only)` : qualifiedName;
  }
  return '-';
}

function ObjectsSection({ publication }: { publication: Publication }) {
  if (publication.isAllTables || publication.objects.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Published Objects">
      <SimpleTable
        columns={[
          { label: 'Object', getter: (object: PublicationTargetObject) => describeObject(object) },
          {
            label: 'Columns',
            getter: (object: PublicationTargetObject) => object.table?.columns?.join(', ') ?? '-',
          },
        ]}
        data={publication.objects}
      />
    </SectionBox>
  );
}

function ParametersSection({ publication }: { publication: Publication }) {
  const entries = Object.entries(publication.parameters);
  if (entries.length === 0) {
    return null;
  }

  return (
    <SectionBox title="Parameters">
      <SimpleTable
        columns={[
          { label: 'Name', getter: ([name]: [string, string]) => name },
          { label: 'Value', getter: ([, value]: [string, string]) => value },
        ]}
        data={entries}
      />
    </SectionBox>
  );
}

export function PublicationDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={Publication}
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
            name: 'Database',
            value: item.dbname,
          },
          {
            name: 'Target',
            value: item.isAllTables ? 'All Tables' : `${item.objects.length} objects`,
          },
          {
            name: 'Status',
            value: <PublicationAppliedLabel publication={item} />,
          },
          {
            name: 'Reclaim Policy',
            value: item.reclaimPolicy,
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'objects',
            section: <ObjectsSection publication={item} />,
          },
          {
            id: 'parameters',
            section: <ParametersSection publication={item} />,
          },
        ]
      }
    />
  );
}
