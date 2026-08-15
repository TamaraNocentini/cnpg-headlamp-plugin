import { K8s } from '@kinvolk/headlamp-plugin/lib';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { StorageConfiguration } from '../../resources/cluster';
import { RequiredLabel } from './RequiredLabel';

interface StorageSizeClassFieldsProps {
  value: StorageConfiguration;
  onChange: (value: StorageConfiguration) => void;
  idPrefix: string;
  sizeLabel?: string;
  sizeRequired?: boolean;
}

// A {size, storageClass} pair, used wherever the Cluster spec expects a StorageConfiguration
// (PGData, WAL storage, each tablespace). storageClass is optional — leaving it unset means "use
// the cluster's default storage class".
export function StorageSizeClassFields({
  value,
  onChange,
  idPrefix,
  sizeLabel = 'Size',
  sizeRequired = true,
}: StorageSizeClassFieldsProps) {
  const [storageClasses] = K8s.ResourceClasses.StorageClass.useList();

  return (
    <>
      <TextField
        fullWidth
        margin="normal"
        label={<RequiredLabel label={sizeLabel} required={sizeRequired} />}
        placeholder="1Gi"
        value={value.size ?? ''}
        onChange={e => onChange({ ...value, size: e.target.value })}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel id={`${idPrefix}-storageclass-label`}>Storage Class</InputLabel>
        <Select
          labelId={`${idPrefix}-storageclass-label`}
          label="Storage Class"
          value={value.storageClass ?? ''}
          onChange={e => onChange({ ...value, storageClass: e.target.value || undefined })}
        >
          <MenuItem value="">Cluster default</MenuItem>
          {(storageClasses ?? []).map(sc => (
            <MenuItem key={sc.getName()} value={sc.getName()}>
              {sc.getName()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
}
