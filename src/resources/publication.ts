import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface PublicationTargetTable {
  only?: boolean;
  name: string;
  schema?: string;
  columns?: string[];
}

export interface PublicationTargetObject {
  tablesInSchema?: string;
  table?: PublicationTargetTable;
}

export interface PublicationTarget {
  allTables?: boolean;
  objects?: PublicationTargetObject[];
}

export interface CnpgPublication extends KubeObjectInterface {
  spec: {
    cluster: {
      name: string;
    };
    name: string;
    dbname: string;
    parameters?: Record<string, string>;
    target: PublicationTarget;
    publicationReclaimPolicy?: 'delete' | 'retain';
    [otherProps: string]: any;
  };
  status?: {
    observedGeneration?: number;
    applied?: boolean;
    message?: string;
    [otherProps: string]: any;
  };
}

export class Publication extends KubeObject<CnpgPublication> {
  static kind = 'Publication';
  static apiName = 'publications';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Publication',
      metadata: {
        name: '',
      },
      spec: {
        cluster: {
          name: '',
        },
        name: '',
        dbname: '',
        target: {
          allTables: true,
        },
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/publications/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/publications';
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

  /** The name of the publication inside PostgreSQL (spec.name — distinct from the K8s object name). */
  get pgName(): string {
    return this.spec.name;
  }

  get dbname(): string {
    return this.spec.dbname;
  }

  get target(): PublicationTarget {
    return this.spec.target;
  }

  get isAllTables(): boolean {
    return !!this.spec.target?.allTables;
  }

  get objects(): PublicationTargetObject[] {
    return this.spec.target?.objects ?? [];
  }

  get parameters(): Record<string, string> {
    return this.spec.parameters ?? {};
  }

  get reclaimPolicy(): string {
    return this.spec.publicationReclaimPolicy ?? 'retain';
  }

  get applied(): boolean | undefined {
    return this.status.applied;
  }

  get message(): string | undefined {
    return this.status.message;
  }
}
