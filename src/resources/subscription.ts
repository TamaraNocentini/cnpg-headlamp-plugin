import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface CnpgSubscription extends KubeObjectInterface {
  spec: {
    cluster: {
      name: string;
    };
    name: string;
    dbname: string;
    parameters?: Record<string, string>;
    publicationName: string;
    publicationDBName?: string;
    externalClusterName: string;
    subscriptionReclaimPolicy?: 'delete' | 'retain';
    [otherProps: string]: any;
  };
  status?: {
    observedGeneration?: number;
    applied?: boolean;
    message?: string;
    [otherProps: string]: any;
  };
}

export class Subscription extends KubeObject<CnpgSubscription> {
  static kind = 'Subscription';
  static apiName = 'subscriptions';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Subscription',
      metadata: {
        name: '',
      },
      spec: {
        cluster: {
          name: '',
        },
        name: '',
        dbname: '',
        publicationName: '',
        externalClusterName: '',
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/subscriptions/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/subscriptions';
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

  /** The name of the subscription inside PostgreSQL (spec.name — distinct from the K8s object name). */
  get pgName(): string {
    return this.spec.name;
  }

  get dbname(): string {
    return this.spec.dbname;
  }

  get publicationName(): string {
    return this.spec.publicationName;
  }

  get publicationDBName(): string | undefined {
    return this.spec.publicationDBName;
  }

  get externalClusterName(): string {
    return this.spec.externalClusterName;
  }

  get parameters(): Record<string, string> {
    return this.spec.parameters ?? {};
  }

  get reclaimPolicy(): string {
    return this.spec.subscriptionReclaimPolicy ?? 'retain';
  }

  get applied(): boolean | undefined {
    return this.status.applied;
  }

  get message(): string | undefined {
    return this.status.message;
  }
}
