import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { Pooler } from '../../resources/pooler';

type PoolerType = 'rw' | 'ro' | 'r';
// CNPG's pgbouncer pooler only supports session and transaction pooling — statement mode isn't
// available (it requires protocol-level guarantees pgbouncer can't make for arbitrary clients).
type PoolMode = 'transaction' | 'session';

export function PoolerCreate() {
  const history = useHistory();
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<PoolerType>('rw');
  const [poolMode, setPoolMode] = useState<PoolMode>('transaction');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );

  async function handleSubmit() {
    if (!selectedCluster || !name) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const namespace = selectedCluster.getNamespace();
    try {
      const created = await Pooler.apiEndpoint.post({
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'Pooler',
        metadata: { name, namespace },
        spec: {
          cluster: { name: selectedCluster.getName() },
          type,
          pgbouncer: { poolMode },
        },
      });
      // Route through a Pooler instance's getListLink() rather than building the path
      // ourselves, so the /c/<cluster> prefix Headlamp's router expects is included correctly.
      history.push(new Pooler(created).getListLink());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pooler');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Pooler">
      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-cluster-label">Cluster</InputLabel>
        <Select
          labelId="pooler-cluster-label"
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
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={selectedCluster ? `pooler-${selectedCluster.getName()}-${type}` : undefined}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-type-label">Type</InputLabel>
        <Select
          labelId="pooler-type-label"
          label="Type"
          value={type}
          onChange={e => setType(e.target.value as PoolerType)}
        >
          <MenuItem value="rw">rw — read/write, routes to the primary</MenuItem>
          <MenuItem value="ro">ro — read-only, routes to replicas</MenuItem>
          <MenuItem value="r">r — any instance</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="pooler-poolmode-label">Pool Mode</InputLabel>
        <Select
          labelId="pooler-poolmode-label"
          label="Pool Mode"
          value={poolMode}
          onChange={e => setPoolMode(e.target.value as PoolMode)}
        >
          <MenuItem value="transaction">transaction — recommended</MenuItem>
          <MenuItem value="session">session</MenuItem>
        </Select>
      </FormControl>

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
