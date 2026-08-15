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
import { Subscription } from '../../resources/subscription';
import { RequiredLabel } from '../common/RequiredLabel';
import { YamlPreview } from '../common/YamlPreview';

interface SubscriptionFormState {
  name: string;
  namespace: string;
  clusterName: string;
  pgName: string;
  dbname: string;
  publicationName: string;
  publicationDBName: string;
  externalClusterName: string;
}

// Builds the Subscription manifest from form state — shared by the YAML preview and the actual
// submit so the two can never drift apart.
function buildSubscriptionManifest(state: SubscriptionFormState) {
  const spec: Record<string, any> = {
    cluster: { name: state.clusterName },
    name: state.pgName,
    dbname: state.dbname,
    publicationName: state.publicationName,
    externalClusterName: state.externalClusterName,
  };
  if (state.publicationDBName) {
    spec.publicationDBName = state.publicationDBName;
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Subscription',
    metadata: { name: state.name, namespace: state.namespace },
    spec,
  };
}

function SubscriptionCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [pgName, setPgName] = useState('');
  const [dbname, setDbname] = useState('app');
  const [publicationName, setPublicationName] = useState('');
  const [publicationDBName, setPublicationDBName] = useState('');
  const [externalClusterName, setExternalClusterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );
  // The subscriber Cluster must already declare the publisher via spec.externalClusters — offer
  // those names as a picker, falling back to free text if none are defined yet.
  const externalClusterOptions = selectedCluster?.spec.externalClusters?.map(ec => ec.name) ?? [];

  const canSubmit =
    !!selectedCluster &&
    !!name &&
    !!pgName &&
    !!dbname &&
    !!publicationName &&
    !!externalClusterName &&
    !submitting;

  const manifest = useMemo(
    () =>
      buildSubscriptionManifest({
        name,
        namespace: selectedCluster?.getNamespace() ?? '',
        clusterName: selectedCluster?.getName() ?? '',
        pgName,
        dbname,
        publicationName,
        publicationDBName,
        externalClusterName,
      }),
    [name, selectedCluster, pgName, dbname, publicationName, publicationDBName, externalClusterName]
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Subscription.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Subscription">
      <FormControl fullWidth margin="normal">
        <InputLabel id="subscription-cluster-label">
          <RequiredLabel label="Cluster (Subscriber)" required />
        </InputLabel>
        <Select
          labelId="subscription-cluster-label"
          label={<RequiredLabel label="Cluster (Subscriber)" required />}
          value={clusterKey}
          onChange={e => {
            setClusterKey(e.target.value);
            setExternalClusterName('');
          }}
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
        helperText="Name of the Kubernetes Subscription object."
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={pgName ? `sub-${pgName}` : undefined}
      />

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Subscription Name" required />}
        helperText="Name of the subscription to create inside PostgreSQL. Cannot be changed afterwards."
        value={pgName}
        onChange={e => setPgName(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Database" required />}
        helperText="Database in the subscriber cluster where the subscription will be created. Cannot be changed afterwards."
        value={dbname}
        onChange={e => setDbname(e.target.value)}
      />

      {externalClusterOptions.length > 0 ? (
        <FormControl fullWidth margin="normal">
          <InputLabel id="subscription-externalcluster-label">
            <RequiredLabel label="Publisher (External Cluster)" required />
          </InputLabel>
          <Select
            labelId="subscription-externalcluster-label"
            label={<RequiredLabel label="Publisher (External Cluster)" required />}
            value={externalClusterName}
            onChange={e => setExternalClusterName(e.target.value)}
          >
            {externalClusterOptions.map(optionName => (
              <MenuItem key={optionName} value={optionName}>
                {optionName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          fullWidth
          margin="normal"
          label={<RequiredLabel label="Publisher (External Cluster)" required />}
          helperText="Name of an entry in the subscriber Cluster's spec.externalClusters pointing at the publisher."
          value={externalClusterName}
          onChange={e => setExternalClusterName(e.target.value)}
        />
      )}

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Publication Name" required />}
        helperText="Name of the publication on the publisher cluster to subscribe to."
        value={publicationName}
        onChange={e => setPublicationName(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Publication Database"
        helperText="Optional. Defaults to the database configured in the external cluster definition."
        value={publicationDBName}
        onChange={e => setPublicationDBName(e.target.value)}
      />

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
export function launchSubscriptionCreate() {
  const activityId = 'cnpg-subscription-create';
  Activity.launch({
    id: activityId,
    title: 'Create Subscription',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <SubscriptionCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
