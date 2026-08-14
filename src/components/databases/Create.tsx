import { Icon } from '@iconify/react';
import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Cluster } from '../../resources/cluster';
import { Database } from '../../resources/database';
import { YamlPreview } from '../common/YamlPreview';

// 'libc' is PostgreSQL's historical default and doesn't require anything else — 'icu' and
// 'builtin' each unlock their own extra fields below (see database-example-icu.yaml).
type LocaleProvider = 'libc' | 'icu' | 'builtin';

interface DatabaseFormState {
  name: string;
  namespace: string;
  clusterName: string;
  pgName: string;
  owner: string;
  template: string;
  encoding: string;
  localeProvider: LocaleProvider | '';
  icuLocale: string;
  icuRules: string;
  builtinLocale: string;
}

// Builds the Database manifest from form state — shared by the YAML preview and the actual
// submit so the two can never drift apart.
function buildDatabaseManifest(state: DatabaseFormState) {
  const spec: Record<string, any> = {
    cluster: { name: state.clusterName },
    name: state.pgName,
    owner: state.owner,
  };
  if (state.template) {
    spec.template = state.template;
  }
  if (state.encoding) {
    spec.encoding = state.encoding;
  }
  if (state.localeProvider) {
    spec.localeProvider = state.localeProvider;
  }
  if (state.localeProvider === 'icu') {
    if (state.icuLocale) {
      spec.icuLocale = state.icuLocale;
    }
    if (state.icuRules) {
      spec.icuRules = state.icuRules;
    }
  }
  if (state.localeProvider === 'builtin' && state.builtinLocale) {
    spec.builtinLocale = state.builtinLocale;
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Database',
    metadata: { name: state.name, namespace: state.namespace },
    spec,
  };
}

function DatabaseCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [pgName, setPgName] = useState('');
  const [owner, setOwner] = useState('app');
  const [template, setTemplate] = useState('');
  const [encoding, setEncoding] = useState('');
  const [localeProvider, setLocaleProvider] = useState<LocaleProvider | ''>('');
  const [icuLocale, setIcuLocale] = useState('');
  const [icuRules, setIcuRules] = useState('');
  const [builtinLocale, setBuiltinLocale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );

  const canSubmit = !!selectedCluster && !!name && !!pgName && !!owner && !submitting;

  const manifest = useMemo(
    () =>
      buildDatabaseManifest({
        name,
        namespace: selectedCluster?.getNamespace() ?? '',
        clusterName: selectedCluster?.getName() ?? '',
        pgName,
        owner,
        template,
        encoding,
        localeProvider,
        icuLocale,
        icuRules,
        builtinLocale,
      }),
    [
      name,
      selectedCluster,
      pgName,
      owner,
      template,
      encoding,
      localeProvider,
      icuLocale,
      icuRules,
      builtinLocale,
    ]
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Database.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create database');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Database">
      <FormControl fullWidth margin="normal">
        <InputLabel id="database-cluster-label">Cluster</InputLabel>
        <Select
          labelId="database-cluster-label"
          label="Cluster"
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
        label="Object Name"
        helperText="Name of the Kubernetes Database object."
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={pgName ? `db-${pgName}` : undefined}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Database Name"
        helperText="Name of the database to create inside PostgreSQL. Cannot be changed afterwards."
        value={pgName}
        onChange={e => setPgName(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Owner"
        helperText="Role that owns the database inside PostgreSQL."
        value={owner}
        onChange={e => setOwner(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Template"
        helperText="Optional. The template database to create this one from. Cannot be changed afterwards."
        placeholder="template0"
        value={template}
        onChange={e => setTemplate(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Encoding"
        helperText="Optional. Character set encoding to use in the database. Cannot be changed afterwards."
        placeholder="UTF8"
        value={encoding}
        onChange={e => setEncoding(e.target.value)}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="database-localeprovider-label">Locale Provider</InputLabel>
        <Select
          labelId="database-localeprovider-label"
          label="Locale Provider"
          value={localeProvider}
          onChange={e => setLocaleProvider(e.target.value as LocaleProvider | '')}
        >
          <MenuItem value="">Default (libc)</MenuItem>
          <MenuItem value="icu">icu — requires PostgreSQL 15+</MenuItem>
          <MenuItem value="builtin">builtin — requires PostgreSQL 17+</MenuItem>
        </Select>
      </FormControl>

      {localeProvider === 'icu' && (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="ICU Locale"
            placeholder="en"
            value={icuLocale}
            onChange={e => setIcuLocale(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="ICU Rules"
            helperText="Optional. Additional collation rules to customize the default collation. Requires PostgreSQL 16+."
            value={icuRules}
            onChange={e => setIcuRules(e.target.value)}
          />
        </>
      )}

      {localeProvider === 'builtin' && (
        <TextField
          fullWidth
          margin="normal"
          label="Builtin Locale"
          placeholder="C"
          value={builtinLocale}
          onChange={e => setBuiltinLocale(e.target.value)}
        />
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
export function launchDatabaseCreate() {
  const activityId = 'cnpg-database-create';
  Activity.launch({
    id: activityId,
    title: 'Create Database',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <DatabaseCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
