import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

/** A reference to a single key within a Secret, as used throughout the ObjectStore spec. */
export interface SecretKeyRef {
  name: string;
  key: string;
}

interface S3Credentials {
  accessKeyId?: SecretKeyRef;
  secretAccessKey?: SecretKeyRef;
  region?: SecretKeyRef;
  sessionToken?: SecretKeyRef;
  inheritFromIAMRole?: boolean;
}

interface WalConfiguration {
  compression?: 'bzip2' | 'gzip' | 'lz4' | 'snappy' | 'xz' | 'zstd';
  encryption?: 'AES256' | 'aws:kms';
  maxParallel?: number;
  archiveAdditionalCommandArgs?: string[];
  restoreAdditionalCommandArgs?: string[];
}

export interface CnpgObjectStore extends KubeObjectInterface {
  spec: {
    configuration: {
      destinationPath: string;
      endpointURL?: string;
      endpointCA?: SecretKeyRef;
      s3Credentials?: S3Credentials;
      // Azure/Google credentials are part of the CRD but not yet exposed by this plugin's form.
      azureCredentials?: Record<string, any>;
      googleCredentials?: Record<string, any>;
      wal?: WalConfiguration;
      data?: Record<string, any>;
      tags?: Record<string, string>;
      historyTags?: Record<string, string>;
      [otherProps: string]: any;
    };
    retentionPolicy?: string;
    instanceSidecarConfiguration?: Record<string, any>;
    [otherProps: string]: any;
  };
  status?: {
    serverRecoveryWindow?: Record<
      string,
      {
        firstRecoverabilityPoint?: string;
        lastSuccessfulBackupTime?: string;
        lastFailedBackupTime?: string;
      }
    >;
    [otherProps: string]: any;
  };
}

export class ObjectStore extends KubeObject<CnpgObjectStore> {
  static kind = 'ObjectStore';
  static apiName = 'objectstores';
  static apiVersion = 'barmancloud.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working S3 example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'barmancloud.cnpg.io/v1',
      kind: 'ObjectStore',
      metadata: {
        name: '',
      },
      spec: {
        configuration: {
          destinationPath: 's3://bucket/path',
          s3Credentials: {
            accessKeyId: { name: '', key: '' },
            secretAccessKey: { name: '', key: '' },
          },
        },
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/objectstores/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/objectstores';
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

  get destinationPath(): string {
    return this.spec.configuration.destinationPath;
  }

  get endpointURL(): string | undefined {
    return this.spec.configuration.endpointURL;
  }

  get retentionPolicy(): string | undefined {
    return this.spec.retentionPolicy;
  }
}
