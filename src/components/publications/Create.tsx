import { Icon } from '@iconify/react';
import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Cluster } from '../../resources/cluster';
import { Publication } from '../../resources/publication';
import { RequiredLabel } from '../common/RequiredLabel';
import { YamlPreview } from '../common/YamlPreview';

type TargetType = 'allTables' | 'objects';
type ObjectRowKind = 'schema' | 'table';

interface PublicationObjectRow {
  id: string;
  kind: ObjectRowKind;
  tablesInSchema: string;
  schema: string;
  tableName: string;
  only: boolean;
  columns: string;
}

function emptyObjectRow(id: string): PublicationObjectRow {
  return {
    id,
    kind: 'schema',
    tablesInSchema: '',
    schema: '',
    tableName: '',
    only: false,
    columns: '',
  };
}

// The repeated "schema or table" row list for a `target.objects` publication — same
// "add/remove row" pattern as CatalogImagesEditor, just specific enough to this shape that it
// isn't worth generalizing into a shared component.
function PublicationObjectsEditor({
  rows,
  onChange,
}: {
  rows: PublicationObjectRow[];
  onChange: (rows: PublicationObjectRow[]) => void;
}) {
  function updateRow(id: string, changes: Partial<PublicationObjectRow>) {
    onChange(rows.map(row => (row.id === id ? { ...row, ...changes } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter(row => row.id !== id));
  }

  function addRow() {
    onChange([...rows, emptyObjectRow(`pub-object-${Date.now()}-${rows.length}`)]);
  }

  return (
    <>
      {rows.map(row => (
        <Box
          key={row.id}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            mt: 1,
            mb: 1,
            flexWrap: 'wrap',
          }}
        >
          <FormControl margin="normal" sx={{ width: 160 }}>
            <InputLabel id={`${row.id}-kind-label`}>
              <RequiredLabel label="Type" required />
            </InputLabel>
            <Select
              labelId={`${row.id}-kind-label`}
              label={<RequiredLabel label="Type" required />}
              value={row.kind}
              onChange={e => updateRow(row.id, { kind: e.target.value as ObjectRowKind })}
            >
              <MenuItem value="schema">All tables in schema</MenuItem>
              <MenuItem value="table">Single table</MenuItem>
            </Select>
          </FormControl>

          {row.kind === 'schema' ? (
            <TextField
              margin="normal"
              label={<RequiredLabel label="Schema" required />}
              value={row.tablesInSchema}
              onChange={e => updateRow(row.id, { tablesInSchema: e.target.value })}
            />
          ) : (
            <>
              <TextField
                margin="normal"
                label="Schema"
                placeholder="public"
                value={row.schema}
                onChange={e => updateRow(row.id, { schema: e.target.value })}
              />
              <TextField
                margin="normal"
                label={<RequiredLabel label="Table Name" required />}
                value={row.tableName}
                onChange={e => updateRow(row.id, { tableName: e.target.value })}
              />
              <TextField
                margin="normal"
                label="Columns"
                helperText="Comma-separated"
                value={row.columns}
                onChange={e => updateRow(row.id, { columns: e.target.value })}
              />
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Checkbox
                    checked={row.only}
                    onChange={e => updateRow(row.id, { only: e.target.checked })}
                  />
                }
                label="Only (exclude descendants)"
              />
            </>
          )}

          <IconButton aria-label="Remove object" onClick={() => removeRow(row.id)} sx={{ mt: 2 }}>
            <Icon icon="mdi:delete" />
          </IconButton>
        </Box>
      ))}
      <Button variant="outlined" onClick={addRow} sx={{ mt: 1 }}>
        Add Object
      </Button>
    </>
  );
}

interface PublicationFormState {
  name: string;
  namespace: string;
  clusterName: string;
  pgName: string;
  dbname: string;
  targetType: TargetType;
  objects: PublicationObjectRow[];
}

// Builds the Publication manifest from form state — shared by the YAML preview and the actual
// submit so the two can never drift apart.
function buildPublicationManifest(state: PublicationFormState) {
  const target: Record<string, any> =
    state.targetType === 'allTables'
      ? { allTables: true }
      : {
          objects: state.objects.map(row => {
            if (row.kind === 'schema') {
              return { tablesInSchema: row.tablesInSchema };
            }
            const columns = row.columns
              .split(',')
              .map(column => column.trim())
              .filter(Boolean);
            return {
              table: {
                name: row.tableName,
                ...(row.schema && { schema: row.schema }),
                ...(row.only && { only: true }),
                ...(columns.length > 0 && { columns }),
              },
            };
          }),
        };

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Publication',
    metadata: { name: state.name, namespace: state.namespace },
    spec: {
      cluster: { name: state.clusterName },
      name: state.pgName,
      dbname: state.dbname,
      target,
    },
  };
}

function PublicationCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [pgName, setPgName] = useState('');
  const [dbname, setDbname] = useState('app');
  const [targetType, setTargetType] = useState<TargetType>('allTables');
  const [objects, setObjects] = useState<PublicationObjectRow[]>([emptyObjectRow('pub-object-0')]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );

  const objectsValid =
    targetType === 'allTables' ||
    (objects.length > 0 &&
      objects.every(row => (row.kind === 'schema' ? !!row.tablesInSchema : !!row.tableName)));
  const canSubmit =
    !!selectedCluster && !!name && !!pgName && !!dbname && objectsValid && !submitting;

  const manifest = useMemo(
    () =>
      buildPublicationManifest({
        name,
        namespace: selectedCluster?.getNamespace() ?? '',
        clusterName: selectedCluster?.getName() ?? '',
        pgName,
        dbname,
        targetType,
        objects,
      }),
    [name, selectedCluster, pgName, dbname, targetType, objects]
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Publication.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create publication');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Publication">
      <FormControl fullWidth margin="normal">
        <InputLabel id="publication-cluster-label">
          <RequiredLabel label="Cluster (Publisher)" required />
        </InputLabel>
        <Select
          labelId="publication-cluster-label"
          label={<RequiredLabel label="Cluster (Publisher)" required />}
          value={clusterKey}
          onChange={e => setClusterKey(e.target.value)}
        >
          {(clusters ?? []).map(cluster => {
            const key = `${cluster.getNamespace()}/${cluster.getName()}`;
            return (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Object Name" required />}
        helperText="Name of the Kubernetes Publication object."
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={pgName ? `pub-${pgName}` : undefined}
      />

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Publication Name" required />}
        helperText="Name of the publication to create inside PostgreSQL. Cannot be changed afterwards."
        value={pgName}
        onChange={e => setPgName(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Database" required />}
        helperText="Database in the publisher cluster where the publication will be created. Cannot be changed afterwards."
        value={dbname}
        onChange={e => setDbname(e.target.value)}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="publication-target-label">
          <RequiredLabel label="Target" required />
        </InputLabel>
        <Select
          labelId="publication-target-label"
          label={<RequiredLabel label="Target" required />}
          value={targetType}
          onChange={e => setTargetType(e.target.value as TargetType)}
        >
          <MenuItem value="allTables">All Tables</MenuItem>
          <MenuItem value="objects">Specific Objects</MenuItem>
        </Select>
      </FormControl>

      {targetType === 'objects' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Published Objects
          </Typography>
          <PublicationObjectsEditor rows={objects} onChange={setObjects} />
        </>
      )}

      <YamlPreview manifest={manifest} onOverrideChange={setManifestOverride} />

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Create
      </Button>
    </SectionBox>
  );
}

// Opens the create form in an overlay, same convention as launchPoolerCreate in
// components/poolers/Create.tsx.
export function launchPublicationCreate() {
  const activityId = 'cnpg-publication-create';
  Activity.launch({
    id: activityId,
    title: 'Create Publication',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <PublicationCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
