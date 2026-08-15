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
import { Pooler } from '../../resources/pooler';
import { RequiredLabel } from '../common/RequiredLabel';
import { YamlPreview } from '../common/YamlPreview';

type PoolerType = 'rw' | 'ro' | 'r';
// CNPG's pgbouncer pooler only supports session and transaction pooling — statement mode isn't
// available (it requires protocol-level guarantees pgbouncer can't make for arbitrary clients).
type PoolMode = 'transaction' | 'session';

interface PoolerFormState {
  name: string;
  namespace: string;
  clusterName: string;
  type: PoolerType;
  poolMode: PoolMode;
}

// Builds the Pooler manifest from form state — shared by the YAML preview and the actual submit
// so the two can never drift apart.
function buildPoolerManifest(state: PoolerFormState) {
  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Pooler',
    metadata: { name: state.name, namespace: state.namespace },
    spec: {
      cluster: { name: state.clusterName },
      type: state.type,
      pgbouncer: { poolMode: state.poolMode },
    },
  };
}

function PoolerCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<PoolerType>('rw');
  const [poolMode, setPoolMode] = useState<PoolMode>('transaction');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );

  const manifest = useMemo(
    () =>
      buildPoolerManifest({
        name,
        namespace: selectedCluster?.getNamespace() ?? '',
        clusterName: selectedCluster?.getName() ?? '',
        type,
        poolMode,
      }),
    [name, selectedCluster, type, poolMode]
  );

  async function handleSubmit() {
    if (!selectedCluster || !name) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Pooler.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pooler');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Pooler">
      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-cluster-label">
          <RequiredLabel label="Cluster" required />
        </InputLabel>
        <Select
          labelId="pooler-cluster-label"
          label={<RequiredLabel label="Cluster" required />}
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
        label={<RequiredLabel label="Name" required />}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={selectedCluster ? `pooler-${selectedCluster.getName()}-${type}` : undefined}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-type-label">
          <RequiredLabel label="Type" required />
        </InputLabel>
        <Select
          labelId="pooler-type-label"
          label={<RequiredLabel label="Type" required />}
          value={type}
          onChange={e => setType(e.target.value as PoolerType)}
        >
          <MenuItem value="rw">rw — read/write, routes to the primary</MenuItem>
          <MenuItem value="ro">ro — read-only, routes to replicas</MenuItem>
          <MenuItem value="r">r — any instance</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-poolmode-label">
          <RequiredLabel label="Pool Mode" required />
        </InputLabel>
        <Select
          labelId="pooler-poolmode-label"
          label={<RequiredLabel label="Pool Mode" required />}
          value={poolMode}
          onChange={e => setPoolMode(e.target.value as PoolMode)}
        >
          <MenuItem value="transaction">transaction — recommended</MenuItem>
          <MenuItem value="session">session</MenuItem>
        </Select>
      </FormControl>

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
        disabled={!selectedCluster || !name || submitting}
        onClick={handleSubmit}
      >
        Create
      </Button>
    </SectionBox>
  );
}

// Opens the create form in an overlay (like core Headlamp's own resource create dialogs) rather
// than navigating to a dedicated page — closing it leaves the user on the list, which then picks
// up the new Pooler via its own live watch.
export function launchPoolerCreate() {
  const activityId = 'cnpg-pooler-create';
  Activity.launch({
    id: activityId,
    title: 'Create Pooler',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <PoolerCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
