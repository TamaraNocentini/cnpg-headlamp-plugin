import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

/**
 * FailoverQuorum is unusual among the CNPG CRDs: it has no `spec` at all, only `status`, and it is
 * written by the operator rather than by users. CNPG creates exactly one per Cluster — same
 * namespace, same name — while quorum-based failover is active, and deletes it again as soon as it
 * isn't (see reconcileFailoverQuorumObject in the CNPG controller). So its presence is itself the
 * signal that the feature is on, and there is nothing to create, edit, or list independently.
 */
export interface CnpgFailoverQuorum extends KubeObjectInterface {
  status?: {
    /** The synchronous replication method last reported by the primary (e.g. "any", "first"). */
    method?: string;
    /** Name of the primary instance that last updated this object. */
    primary?: string;
    /** Instance names that are candidates for synchronous replication. */
    standbyNames?: string[];
    /** How many synchronous standbys a transaction must wait for. */
    standbyNumber?: number;
    [otherProps: string]: any;
  };
}

export class FailoverQuorum extends KubeObject<CnpgFailoverQuorum> {
  static kind = 'FailoverQuorum';
  static apiName = 'failoverquorums';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  get status() {
    return this.jsonData.status ?? {};
  }

  get method(): string | undefined {
    return this.status.method;
  }

  get primary(): string | undefined {
    return this.status.primary;
  }

  get standbyNames(): string[] {
    return this.status.standbyNames ?? [];
  }

  get standbyNumber(): number | undefined {
    return this.status.standbyNumber;
  }
}
