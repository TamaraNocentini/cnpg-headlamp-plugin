import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  ActionButton,
  ConditionsTable,
  DateLabel,
  DetailsGrid,
  LogViewer,
  ResourceLink,
  SectionBox,
  SimpleTable,
  StatusLabel,
  Terminal,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Cluster } from '../../resources/cluster';
import { formatCnpgLogLine, parseCnpgLogLine } from '../../resources/cnpgLog';

type Pod = InstanceType<typeof K8s.ResourceClasses.Pod>;

function launchTerminal(pod: Pod) {
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

function InstanceLogViewer({ pod, onClose }: { pod: Pod; onClose: () => void }) {
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [loggerFilter, setLoggerFilter] = useState('');
  const [search, setSearch] = useState('');
  const container = pod.spec.containers[0]?.name;

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
// instead of stranding them on the pod detail page.
function launchLogs(pod: Pod) {
  const activityId = 'cnpg-logs-' + pod.metadata.uid;
  Activity.launch({
    id: activityId,
    title: pod.metadata.name,
    cluster: pod.cluster,
    icon: <Icon icon="mdi:file-document-box-outline" width="100%" height="100%" />,
    location: 'full',
    content: <InstanceLogViewer pod={pod} onClose={() => Activity.close(activityId)} />,
  });
}

function InstanceActions({ pod }: { pod: Pod }) {
  return (
    <>
      <ActionButton
        description="View logs"
        icon="mdi:file-document-box-outline"
        onClick={() => launchLogs(pod)}
      />
      <ActionButton
        description="Open terminal"
        icon="mdi:console"
        onClick={() => launchTerminal(pod)}
      />
    </>
  );
}

function InstanceRoleLabel({ pod }: { pod: Pod }) {
  const role = pod.metadata.labels?.['cnpg.io/instanceRole'] ?? '-';
  const isReady = pod.status.containerStatuses?.every(container => container.ready) ?? false;

  if (!isReady) {
    return <StatusLabel status="error">{role} (not ready)</StatusLabel>;
  }
  switch (role) {
    case 'primary':
      return <StatusLabel status="success">primary</StatusLabel>;
    case 'replica':
      return <StatusLabel status="">replica</StatusLabel>;
    case 'unhealthy':
      return <StatusLabel status="error">unhealthy</StatusLabel>;
    default:
      return <>{role}</>;
  }
}

function InstancesSection({ cluster }: { cluster: Cluster }) {
  const [pods] = K8s.ResourceClasses.Pod.useList({
    namespace: cluster.getNamespace(),
    labelSelector: `cnpg.io/cluster=${cluster.getName()}`,
  });

  return (
    <SectionBox title="Instances">
      <SimpleTable
        columns={[
          {
            label: 'Name',
            getter: (pod: Pod) => <ResourceLink resource={pod} />,
          },
          {
            label: 'Role',
            getter: (pod: Pod) => <InstanceRoleLabel pod={pod} />,
          },
          {
            label: 'Phase',
            getter: (pod: Pod) => pod.status.phase,
          },
          {
            label: 'Timeline',
            getter: (pod: Pod) =>
              cluster.getInstanceReportedState(pod.getName())?.timeLineID ?? '-',
          },
          {
            label: 'Node',
            getter: (pod: Pod) => pod.spec.nodeName,
          },
          {
            label: 'QoS',
            getter: (pod: Pod) => pod.status.qosClass ?? '-',
          },
          {
            label: 'Actions',
            getter: (pod: Pod) => <InstanceActions pod={pod} />,
          },
        ]}
        data={pods ?? []}
      />
    </SectionBox>
  );
}

export function ClusterDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      resourceType={Cluster}
      name={name}
      namespace={namespace}
      withEvents
      extraInfo={item =>
        item && [
          {
            name: 'Health',
            value: <StatusLabel status={item.health}>{item.healthLabel}</StatusLabel>,
          },
          {
            name: 'Phase',
            value: item.phase,
          },
          {
            name: 'Current Primary',
            value: item.currentPrimary,
          },
          {
            name: 'Target Primary',
            value: item.targetPrimary,
          },
          {
            name: 'Primary Since',
            value: item.currentPrimaryTimestamp && (
              <DateLabel date={item.currentPrimaryTimestamp} format="mini" />
            ),
          },
          {
            name: 'Instances',
            value: `${item.readyInstances} ready / ${item.instances} total`,
          },
          {
            name: 'Timeline',
            value: item.timelineID?.toString(),
          },
          {
            name: 'PostgreSQL Image',
            value: item.image,
          },
          {
            name: 'System ID',
            value: item.systemID,
          },
          {
            name: 'Synchronous Replication',
            value:
              item.instances > 1 && !item.hasSynchronousReplication ? (
                <StatusLabel status="warning">
                  Off — multiple instances without synchronous replication risk data loss on
                  failover
                </StatusLabel>
              ) : item.hasSynchronousReplication ? (
                `On (${item.syncReplicasRequired} required)`
              ) : (
                'N/A (single instance)'
              ),
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'instances',
            section: <InstancesSection cluster={item} />,
          },
          {
            id: 'conditions',
            section: (
              <SectionBox title="Conditions">
                <ConditionsTable resource={item.jsonData} />
              </SectionBox>
            ),
          },
        ]
      }
    />
  );
}
