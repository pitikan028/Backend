import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import config from '../config/index.js';

let s3ClientInstance = null;

export function getS3Client() {
  if (!s3ClientInstance) {
    const { endpoint, region, accessKeyId, secretAccessKey } = config.neon.storage;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      return null;
    }
    s3ClientInstance = new S3Client({
      endpoint,
      region,
      forcePathStyle: true, // Neon requires path-style addressing
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

export const storageService = {
  isConfigured() {
    return Boolean(config.neon.storage.endpoint && config.neon.storage.accessKeyId);
  },

  async uploadObject(key, body, contentType = 'application/octet-stream') {
    const client = getS3Client();
    if (!client) throw new Error('Neon Object Storage is not configured');

    const bucket = config.neon.storage.bucket;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    return client.send(command);
  },

  async getObject(key) {
    const client = getS3Client();
    if (!client) throw new Error('Neon Object Storage is not configured');

    const bucket = config.neon.storage.bucket;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);
    const byteArray = await response.Body.transformToByteArray();
    return {
      contentType: response.ContentType,
      data: Buffer.from(byteArray),
    };
  },

  async listObjects(prefix = '') {
    const client = getS3Client();
    if (!client) throw new Error('Neon Object Storage is not configured');

    const bucket = config.neon.storage.bucket;
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    const response = await client.send(command);
    return response.Contents || [];
  },

  async testConnection() {
    if (!this.isConfigured()) {
      return { ok: false, error: 'Neon Object Storage env vars missing' };
    }
    try {
      const testKey = 'test/health-check.txt';
      const content = Buffer.from('Neon Object Storage connection verified at ' + new Date().toISOString());
      await this.uploadObject(testKey, content, 'text/plain');
      const downloaded = await this.getObject(testKey);
      return {
        ok: true,
        bucket: config.neon.storage.bucket,
        endpoint: config.neon.storage.endpoint,
        verifiedContent: downloaded.data.toString(),
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

export default storageService;
