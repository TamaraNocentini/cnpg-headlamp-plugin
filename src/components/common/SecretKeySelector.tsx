import { K8s } from '@kinvolk/headlamp-plugin/lib';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { SecretKeyRef } from '../../resources/objectStore';

interface SecretKeySelectorProps {
  namespace: string;
  label: string;
  value?: SecretKeyRef;
  onChange: (value: SecretKeyRef) => void;
  idPrefix: string;
}

// Picks an existing Secret (scoped to `namespace`) and one of its keys — used wherever the
// ObjectStore spec expects a SecretKeyRef (credentials, endpointCA, ...). Only references
// pre-existing Secrets; it does not create one.
export function SecretKeySelector({
  namespace,
  label,
  value,
  onChange,
  idPrefix,
}: SecretKeySelectorProps) {
  const [secrets] = K8s.ResourceClasses.Secret.useList({ namespace });

  const selectedSecret = (secrets ?? []).find(secret => secret.getName() === value?.name);
  const keyOptions = Object.keys(selectedSecret?.jsonData.data ?? {});

  return (
    <>
      <FormControl fullWidth margin="normal">
        <InputLabel id={`${idPrefix}-secret-label`}>{label} — Secret</InputLabel>
        <Select
          labelId={`${idPrefix}-secret-label`}
          label={`${label} — Secret`}
          value={value?.name ?? ''}
          onChange={e => onChange({ name: e.target.value, key: '' })}
        >
          {(secrets ?? []).map(secret => (
            <MenuItem key={secret.getName()} value={secret.getName()}>
              {secret.getName()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal" disabled={!selectedSecret}>
        <InputLabel id={`${idPrefix}-key-label`}>{label} — Key</InputLabel>
        <Select
          labelId={`${idPrefix}-key-label`}
          label={`${label} — Key`}
          value={value?.key ?? ''}
          onChange={e => onChange({ name: value?.name ?? '', key: e.target.value })}
        >
          {keyOptions.map(key => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
}
