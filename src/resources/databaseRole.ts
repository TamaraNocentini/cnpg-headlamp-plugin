import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export type EnsureOption = 'present' | 'absent';

export interface ClientCertificateConfiguration {
  enabled?: boolean;
}

export interface ClientCertificateState {
  expiration?: string;
  message?: string;
}

/** Standard metav1.Condition shape, as used in DatabaseRole.status.conditions. */
export interface DatabaseRoleCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface CnpgDatabaseRole extends KubeObjectInterface {
  spec: {
    cluster: {
      name: string;
    };
    name: string;
    comment?: string;
    ensure?: EnsureOption;
    passwordSecret?: {
      name: string;
    };
    connectionLimit?: number;
    validUntil?: string;
    inRoles?: string[];
    inherit?: boolean;
    disablePassword?: boolean;
    superuser?: boolean;
    createdb?: boolean;
    createrole?: boolean;
    login?: boolean;
    replication?: boolean;
    bypassrls?: boolean;
    databaseRoleReclaimPolicy?: 'delete' | 'retain';
    clientCertificate?: ClientCertificateConfiguration;
    [otherProps: string]: any;
  };
  status?: {
    observedGeneration?: number;
    applied?: boolean;
    message?: string;
    secretResourceVersion?: string;
    clientCertificate?: ClientCertificateState;
    conditions?: DatabaseRoleCondition[];
    [otherProps: string]: any;
  };
}

export class DatabaseRole extends KubeObject<CnpgDatabaseRole> {
  static kind = 'DatabaseRole';
  static apiName = 'databaseroles';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'DatabaseRole',
      metadata: {
        name: '',
      },
      spec: {
        cluster: {
          name: '',
        },
        name: '',
        login: true,
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/databaseroles/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/databaseroles';
  }

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status ?? {};
  }

  // See the equivalent comment on Pooler.metadata in pooler.ts — same workaround.
  get metadata() {
    const metadata = { ...super.metadata };
    delete metadata.annotations;
    return metadata;
  }

  get clusterName(): string {
    return this.spec.cluster.name;
  }

  /** The name of the role inside PostgreSQL (spec.name — distinct from the K8s object name). */
  get pgName(): string {
    return this.spec.name;
  }

  get ensure(): EnsureOption {
    return this.spec.ensure ?? 'present';
  }

  get applied(): boolean | undefined {
    return this.status.applied;
  }

  get message(): string | undefined {
    return this.status.message;
  }

  get login(): boolean {
    return !!this.spec.login;
  }

  get superuser(): boolean {
    return !!this.spec.superuser;
  }

  get createdb(): boolean {
    return !!this.spec.createdb;
  }

  get createrole(): boolean {
    return !!this.spec.createrole;
  }

  get inherit(): boolean {
    return this.spec.inherit ?? true;
  }

  get replication(): boolean {
    return !!this.spec.replication;
  }

  get bypassrls(): boolean {
    return !!this.spec.bypassrls;
  }

  get connectionLimit(): number {
    return this.spec.connectionLimit ?? -1;
  }

  get validUntil(): string | undefined {
    return this.spec.validUntil;
  }

  get inRoles(): string[] {
    return this.spec.inRoles ?? [];
  }

  get comment(): string | undefined {
    return this.spec.comment;
  }

  get passwordSecretName(): string | undefined {
    return this.spec.passwordSecret?.name;
  }

  get disablePassword(): boolean {
    return !!this.spec.disablePassword;
  }

  get databaseRoleReclaimPolicy(): string {
    return this.spec.databaseRoleReclaimPolicy ?? 'retain';
  }

  get clientCertificateEnabled(): boolean {
    return !!this.spec.clientCertificate?.enabled;
  }

  get clientCertificateStatus(): ClientCertificateState | undefined {
    return this.status.clientCertificate;
  }
}
