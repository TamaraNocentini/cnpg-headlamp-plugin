import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

/** A single entry in Cluster.status.conditions (standard metav1.Condition shape). */
export interface ClusterCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

interface SynchronousReplicaConfiguration {
  method: 'any' | 'first';
  number: number;
}

export interface CnpgCluster extends KubeObjectInterface {
  spec: {
    instances: number;
    minSyncReplicas?: number;
    maxSyncReplicas?: number;
    postgresql?: {
      synchronous?: SynchronousReplicaConfiguration;
    };
    [otherProps: string]: any;
  };
  status?: {
    phase?: string;
    phaseReason?: string;
    currentPrimary?: string;
    targetPrimary?: string;
    instances?: number;
    readyInstances?: number;
    conditions?: ClusterCondition[];
    [otherProps: string]: any;
  };
}

/** Cluster.status.phase value CNPG uses when everything is reconciled and healthy. */
const PHASE_HEALTHY = 'Cluster in healthy state';

const CONDITION_CONTINUOUS_ARCHIVING = 'ContinuousArchiving';
const CONDITION_LAST_BACKUP_SUCCEEDED = 'LastBackupSucceeded';

export type ClusterHealth = 'success' | 'warning' | 'error';

export class Cluster extends KubeObject<CnpgCluster> {
  static kind = 'Cluster';
  static apiName = 'clusters';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  static get detailsRoute() {
    return '/cnpg/clusters/:namespace/:name';
  }

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status ?? {};
  }

  get phase(): string | undefined {
    return this.status.phase;
  }

  get isPhaseHealthy(): boolean {
    return this.phase === PHASE_HEALTHY;
  }

  getCondition(type: string): ClusterCondition | undefined {
    return this.status.conditions?.find(condition => condition.type === type);
  }

  get isArchivingWal(): boolean | undefined {
    const condition = this.getCondition(CONDITION_CONTINUOUS_ARCHIVING);
    return condition ? condition.status === 'True' : undefined;
  }

  /** True/false if CNPG has reported on the last backup, undefined if no backup has run yet. */
  get isLastBackupSucceeded(): boolean | undefined {
    const condition = this.getCondition(CONDITION_LAST_BACKUP_SUCCEEDED);
    return condition ? condition.status === 'True' : undefined;
  }

  get currentPrimary(): string | undefined {
    return this.status.currentPrimary;
  }

  get targetPrimary(): string | undefined {
    return this.status.targetPrimary;
  }

  /** True while CNPG is switching the primary role from currentPrimary to targetPrimary. */
  get isSwitchoverInProgress(): boolean {
    return (
      !!this.currentPrimary && !!this.targetPrimary && this.currentPrimary !== this.targetPrimary
    );
  }

  get instances(): number {
    return this.status.instances ?? this.spec.instances ?? 0;
  }

  get readyInstances(): number {
    return this.status.readyInstances ?? 0;
  }

  /** Number of synchronous standby replicas required, from whichever config style is in use. */
  get syncReplicasRequired(): number {
    return this.spec.postgresql?.synchronous?.number ?? this.spec.minSyncReplicas ?? 0;
  }

  get hasSynchronousReplication(): boolean {
    return this.instances > 1 && this.syncReplicasRequired > 0;
  }

  /**
   * Traffic-light health for the cluster:
   * - error (red): the cluster phase itself is unhealthy.
   * - warning (yellow): phase is healthy, but WAL archiving and/or the last backup aren't confirmed good.
   * - success (green): phase is healthy, WAL archiving is working, and the last backup succeeded
   *   (or no backup has been configured/taken yet, in which case it isn't held against the cluster).
   */
  get health(): ClusterHealth {
    if (!this.isPhaseHealthy) {
      return 'error';
    }
    if (this.isArchivingWal === false || this.isLastBackupSucceeded === false) {
      return 'warning';
    }
    return 'success';
  }

  get healthLabel(): string {
    switch (this.health) {
      case 'success':
        return 'Healthy';
      case 'warning':
        return 'Degraded';
      default:
        return 'Unhealthy';
    }
  }
}
