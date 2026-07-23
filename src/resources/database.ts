import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export type EnsureOption = 'present' | 'absent';

/** Fields shared by every managed object under spec (schemas, extensions, FDWs, servers). */
export interface DatabaseObjectSpec {
  name: string;
  ensure?: EnsureOption;
  [otherProps: string]: any;
}

export interface SchemaSpec extends DatabaseObjectSpec {
  owner?: string;
}

export interface ExtensionSpec extends DatabaseObjectSpec {
  version?: string;
  schema?: string;
}

export interface OptionSpec {
  name: string;
  value: string;
  ensure?: EnsureOption;
}

export interface UsageSpec {
  name: string;
  type?: 'grant' | 'revoke';
}

export interface FDWSpec extends DatabaseObjectSpec {
  handler?: string;
  validator?: string;
  owner?: string;
  options?: OptionSpec[];
  usage?: UsageSpec[];
}

export interface ServerSpec extends DatabaseObjectSpec {
  fdw: string;
  options?: OptionSpec[];
  usage?: UsageSpec[];
}

/** Reconciliation status of a single managed schema/extension/FDW/server. */
export interface DatabaseObjectStatus {
  name: string;
  applied: boolean;
  message?: string;
}

export interface CnpgDatabase extends KubeObjectInterface {
  spec: {
    cluster: {
      name: string;
    };
    ensure?: EnsureOption;
    name: string;
    owner: string;
    template?: string;
    encoding?: string;
    locale?: string;
    localeProvider?: 'libc' | 'icu' | 'builtin';
    localeCollate?: string;
    localeCType?: string;
    icuLocale?: string;
    icuRules?: string;
    builtinLocale?: string;
    collationVersion?: string;
    isTemplate?: boolean;
    allowConnections?: boolean;
    connectionLimit?: number;
    tablespace?: string;
    databaseReclaimPolicy?: 'delete' | 'retain';
    schemas?: SchemaSpec[];
    extensions?: ExtensionSpec[];
    fdws?: FDWSpec[];
    servers?: ServerSpec[];
    [otherProps: string]: any;
  };
  status?: {
    observedGeneration?: number;
    applied?: boolean;
    message?: string;
    schemas?: DatabaseObjectStatus[];
    extensions?: DatabaseObjectStatus[];
    fdws?: DatabaseObjectStatus[];
    servers?: DatabaseObjectStatus[];
    [otherProps: string]: any;
  };
}

export class Database extends KubeObject<CnpgDatabase> {
  static kind = 'Database';
  static apiName = 'databases';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Database',
      metadata: {
        name: '',
      },
      spec: {
        cluster: {
          name: '',
        },
        name: '',
        owner: '',
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/databases/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/databases';
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

  /** The name of the database inside PostgreSQL (spec.name — distinct from the K8s object name). */
  get pgName(): string {
    return this.spec.name;
  }

  get owner(): string {
    return this.spec.owner;
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

  get encoding(): string | undefined {
    return this.spec.encoding;
  }

  get localeProvider(): string | undefined {
    return this.spec.localeProvider;
  }

  get template(): string | undefined {
    return this.spec.template;
  }

  get tablespace(): string | undefined {
    return this.spec.tablespace;
  }

  get databaseReclaimPolicy(): string {
    return this.spec.databaseReclaimPolicy ?? 'retain';
  }

  get schemas(): SchemaSpec[] {
    return this.spec.schemas ?? [];
  }

  get extensions(): ExtensionSpec[] {
    return this.spec.extensions ?? [];
  }

  get fdws(): FDWSpec[] {
    return this.spec.fdws ?? [];
  }

  get servers(): ServerSpec[] {
    return this.spec.servers ?? [];
  }

  getSchemaStatus(name: string): DatabaseObjectStatus | undefined {
    return this.status.schemas?.find(schema => schema.name === name);
  }

  getExtensionStatus(name: string): DatabaseObjectStatus | undefined {
    return this.status.extensions?.find(extension => extension.name === name);
  }

  getFDWStatus(name: string): DatabaseObjectStatus | undefined {
    return this.status.fdws?.find(fdw => fdw.name === name);
  }

  getServerStatus(name: string): DatabaseObjectStatus | undefined {
    return this.status.servers?.find(server => server.name === name);
  }
}
