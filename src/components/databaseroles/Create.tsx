import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Cluster } from '../../resources/cluster';
import { DatabaseRole } from '../../resources/databaseRole';
import { RequiredLabel } from '../common/RequiredLabel';
import { YamlPreview } from '../common/YamlPreview';

interface DatabaseRoleFormState {
  name: string;
  namespace: string;
  clusterName: string;
  pgName: string;
  comment: string;
  login: boolean;
  superuser: boolean;
  createdb: boolean;
  createrole: boolean;
  inherit: boolean;
  replication: boolean;
  bypassrls: boolean;
  connectionLimit: string;
  inRoles: string;
  passwordSecretName: string;
  disablePassword: boolean;
  clientCertificate: boolean;
}

// Builds the DatabaseRole manifest from form state — shared by the YAML preview and the actual
// submit so the two can never drift apart.
function buildDatabaseRoleManifest(state: DatabaseRoleFormState) {
  const spec: Record<string, any> = {
    cluster: { name: state.clusterName },
    name: state.pgName,
    login: state.login,
    superuser: state.superuser,
    createdb: state.createdb,
    createrole: state.createrole,
    inherit: state.inherit,
    replication: state.replication,
    bypassrls: state.bypassrls,
  };
  if (state.comment) {
    spec.comment = state.comment;
  }
  if (state.connectionLimit) {
    spec.connectionLimit = Number(state.connectionLimit);
  }
  const inRoles = state.inRoles
    .split(',')
    .map(role => role.trim())
    .filter(Boolean);
  if (inRoles.length > 0) {
    spec.inRoles = inRoles;
  }
  if (state.disablePassword) {
    spec.disablePassword = true;
  } else if (state.passwordSecretName) {
    spec.passwordSecret = { name: state.passwordSecretName };
  }
  if (state.clientCertificate) {
    spec.clientCertificate = { enabled: true };
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'DatabaseRole',
    metadata: { name: state.name, namespace: state.namespace },
    spec,
  };
}

function DatabaseRoleCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [pgName, setPgName] = useState('');
  const [comment, setComment] = useState('');
  const [login, setLogin] = useState(true);
  const [superuser, setSuperuser] = useState(false);
  const [createdb, setCreatedb] = useState(false);
  const [createrole, setCreaterole] = useState(false);
  const [inherit, setInherit] = useState(true);
  const [replication, setReplication] = useState(false);
  const [bypassrls, setBypassrls] = useState(false);
  const [connectionLimit, setConnectionLimit] = useState('');
  const [inRoles, setInRoles] = useState('');
  const [passwordSecretName, setPasswordSecretName] = useState('');
  const [disablePassword, setDisablePassword] = useState(false);
  const [clientCertificate, setClientCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );
  const [secrets] = K8s.ResourceClasses.Secret.useList({
    namespace: selectedCluster?.getNamespace(),
  });

  // clientCertificate requires login (CRD validation rule), same restriction enforced here.
  const canSubmit =
    !!selectedCluster && !!name && !!pgName && (!clientCertificate || login) && !submitting;

  const manifest = useMemo(
    () =>
      buildDatabaseRoleManifest({
        name,
        namespace: selectedCluster?.getNamespace() ?? '',
        clusterName: selectedCluster?.getName() ?? '',
        pgName,
        comment,
        login,
        superuser,
        createdb,
        createrole,
        inherit,
        replication,
        bypassrls,
        connectionLimit,
        inRoles,
        passwordSecretName,
        disablePassword,
        clientCertificate,
      }),
    [
      name,
      selectedCluster,
      pgName,
      comment,
      login,
      superuser,
      createdb,
      createrole,
      inherit,
      replication,
      bypassrls,
      connectionLimit,
      inRoles,
      passwordSecretName,
      disablePassword,
      clientCertificate,
    ]
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await DatabaseRole.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Role">
      <FormControl fullWidth margin="normal">
        <InputLabel id="databaserole-cluster-label">
          <RequiredLabel label="Cluster" required />
        </InputLabel>
        <Select
          labelId="databaserole-cluster-label"
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
        label={<RequiredLabel label="Object Name" required />}
        helperText="Name of the Kubernetes DatabaseRole object."
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={pgName ? `role-${pgName}` : undefined}
      />

      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label="Role Name" required />}
        helperText="Name of the role to create inside PostgreSQL. Cannot be changed afterwards."
        value={pgName}
        onChange={e => setPgName(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Comment"
        helperText="A database-side comment on the role."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Attributes
      </Typography>
      <FormControlLabel
        control={<Checkbox checked={login} onChange={e => setLogin(e.target.checked)} />}
        label="Login"
      />
      <FormControlLabel
        control={<Checkbox checked={superuser} onChange={e => setSuperuser(e.target.checked)} />}
        label="Superuser"
      />
      <FormControlLabel
        control={<Checkbox checked={createdb} onChange={e => setCreatedb(e.target.checked)} />}
        label="Create DB"
      />
      <FormControlLabel
        control={<Checkbox checked={createrole} onChange={e => setCreaterole(e.target.checked)} />}
        label="Create Role"
      />
      <FormControlLabel
        control={<Checkbox checked={inherit} onChange={e => setInherit(e.target.checked)} />}
        label="Inherit"
      />
      <FormControlLabel
        control={
          <Checkbox checked={replication} onChange={e => setReplication(e.target.checked)} />
        }
        label="Replication"
      />
      <FormControlLabel
        control={<Checkbox checked={bypassrls} onChange={e => setBypassrls(e.target.checked)} />}
        label="Bypass RLS"
      />

      <TextField
        fullWidth
        margin="normal"
        label="Connection Limit"
        type="number"
        inputProps={{ min: -1 }}
        helperText="-1 (default) means no limit."
        value={connectionLimit}
        onChange={e => setConnectionLimit(e.target.value)}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Member Of (In Roles)"
        helperText="Comma-separated list of existing roles this role is added to, e.g. pg_monitor, pg_signal_backend."
        value={inRoles}
        onChange={e => setInRoles(e.target.value)}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Password
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={disablePassword}
            onChange={e => {
              setDisablePassword(e.target.checked);
              if (e.target.checked) {
                setPasswordSecretName('');
              }
            }}
          />
        }
        label="Disable password (NULL in PostgreSQL)"
      />
      {!disablePassword && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="databaserole-passwordsecret-label">Password Secret</InputLabel>
          <Select
            labelId="databaserole-passwordsecret-label"
            label="Password Secret"
            value={passwordSecretName}
            onChange={e => setPasswordSecretName(e.target.value)}
            disabled={!selectedCluster}
          >
            {(secrets ?? []).map(secret => (
              <MenuItem key={secret.getName()} value={secret.getName()}>
                {secret.getName()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={clientCertificate}
            onChange={e => setClientCertificate(e.target.checked)}
            disabled={!login}
          />
        }
        label="Issue a TLS client certificate for this role (requires Login)"
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
export function launchDatabaseRoleCreate() {
  const activityId = 'cnpg-databaserole-create';
  Activity.launch({
    id: activityId,
    title: 'Create Role',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <DatabaseRoleCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
