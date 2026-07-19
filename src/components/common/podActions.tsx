import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import { LogViewer, StatusLabel, Terminal } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useEffect, useMemo, useState } from 'react';
import { formatCnpgLogLine, parseCnpgLogLine } from '../../resources/cnpgLog';

export type Pod = InstanceType<typeof K8s.ResourceClasses.Pod>;

export function launchTerminal(pod: Pod) {
  const activityId = 'cnpg-terminal-' + pod.metadata.uid;
  Activity.launch({
    id: activityId,
    title: pod.metadata.name,
    cluster: pod.cluster,
    icon: <Icon icon="mdi:console" width="100%" height="100%" />,
    location: 'full',
    content: (
      <Terminal
        noDialog
        open
        item={pod}
        onClose={() => Activity.close(activityId)}
        isAttach={false}
      />
    ),
  });
}

function PodLogViewer({ pod, onClose }: { pod: Pod; onClose: () => void }) {
  // Native sidecars (e.g. the Barman Cloud plugin's instance sidecar) are init containers with
  // restartPolicy: Always — they run for the pod's whole life like a regular container, but live
  // in spec.initContainers rather than spec.containers.
  const containerNames = [
    ...(pod.spec.initContainers ?? []).map(c => c.name),
    ...pod.spec.containers.map(c => c.name),
  ];
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [loggerFilter, setLoggerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [container, setContainer] = useState(containerNames[0]);

  useEffect(() => {
    // getLogs mutates and reuses the same array reference on every streamed chunk, so we copy it
    // — otherwise React's setState bails out after the first update (same reference => no re-render).
    const cancel = pod.getLogs(container, ({ logs: lines }) => setRawLogs([...lines]), {
      tailLines: 200,
      follow: true,
    });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod.metadata.uid, container]);

  const parsedLogs = useMemo(() => rawLogs.map(parseCnpgLogLine), [rawLogs]);

  const severities = useMemo(
    () => Array.from(new Set(parsedLogs.map(entry => entry.severity).filter(Boolean))).sort(),
    [parsedLogs]
  );
  const loggers = useMemo(
    () => Array.from(new Set(parsedLogs.map(entry => entry.logger).filter(Boolean))).sort(),
    [parsedLogs]
  );

  const displayLogs = useMemo(
    () =>
      parsedLogs
        .filter(entry => !severityFilter || entry.severity === severityFilter)
        .filter(entry => !loggerFilter || entry.logger === loggerFilter)
        .filter(entry => !search || entry.message.toLowerCase().includes(search.toLowerCase()))
        .map(formatCnpgLogLine),
    [parsedLogs, severityFilter, loggerFilter, search]
  );

  return (
    <LogViewer
      noDialog
      open
      logs={displayLogs}
      title={pod.metadata.name}
      downloadName={`${pod.metadata.name}_${container}`}
      onClose={onClose}
      topActions={[
        ...(containerNames.length > 1
          ? [
              <Select
                key="container"
                size="small"
                value={container}
                onChange={e => {
                  setContainer(e.target.value);
                  setSeverityFilter('');
                  setLoggerFilter('');
                }}
              >
                {containerNames.map(name => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>,
            ]
          : []),
        <TextField
          key="search"
          size="small"
          placeholder="Search message…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />,
        <Select
          key="severity"
          size="small"
          displayEmpty
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
        >
          <MenuItem value="">All levels</MenuItem>
          {severities.map(severity => (
            <MenuItem key={severity} value={severity}>
              {severity}
            </MenuItem>
          ))}
        </Select>,
        <Select
          key="logger"
          size="small"
          displayEmpty
          value={loggerFilter}
          onChange={e => setLoggerFilter(e.target.value)}
        >
          <MenuItem value="">All loggers</MenuItem>
          {loggers.map(logger => (
            <MenuItem key={logger} value={logger}>
              {logger}
            </MenuItem>
          ))}
        </Select>,
      ]}
    />
  );
}

// Opens the log viewer/terminal in an overlay (like core Headlamp's own pod actions) rather than
// navigating to the pod's own page — that way closing it leaves the user right where they were,
// instead of stranding them on the previous page.
export function launchLogs(pod: Pod) {
  const activityId = 'cnpg-logs-' + pod.metadata.uid;
  Activity.launch({
    id: activityId,
    title: pod.metadata.name,
    cluster: pod.cluster,
    icon: <Icon icon="mdi:file-document-box-outline" width="100%" height="100%" />,
    location: 'full',
    content: <PodLogViewer pod={pod} onClose={() => Activity.close(activityId)} />,
  });
}

export function PodPhaseLabel({ pod }: { pod: Pod }) {
  const phase = pod.status.phase;
  switch (phase) {
    case 'Succeeded':
      return <StatusLabel status="success">{phase}</StatusLabel>;
    case 'Failed':
    case 'Unknown':
      return <StatusLabel status="error">{phase}</StatusLabel>;
    case 'Pending':
      return <StatusLabel status="warning">{phase}</StatusLabel>;
    default:
      return <StatusLabel status="">{phase}</StatusLabel>;
  }
}
