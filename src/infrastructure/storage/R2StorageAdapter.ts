import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/infrastructure/env";
import type { StoragePort } from "@/domain/ports/services";

/** Cloudflare R2 via the S3-compatible API. Browser uploads via short-lived presigned PUT. */
export class R2StorageAdapter implements StoragePort {
  private _client: S3Client | null = null;
  private get client(): S3Client {
    if (!this._client) {
      const c = env.r2();
      this._client = new S3Client({
        region: "auto",
        endpoint: c.endpoint,
        credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      });
    }
    return this._client;
  }

  async presignUpload({ key, contentType }: { key: string; contentType: string }) {
    const cmd = new PutObjectCommand({
      Bucket: env.r2().bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: 600 }); // 10 min
    return { url };
  }

  async getBytes(key: string): Promise<Uint8Array> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: env.r2().bucket, Key: key }),
    );
    const arr = await res.Body!.transformToByteArray();
    return arr;
  }
}
