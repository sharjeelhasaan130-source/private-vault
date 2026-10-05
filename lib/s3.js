import { S3Client, HeadObjectCommand, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// Provider swap: change only these env vars (any S3-compatible storage works).
const c = new S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_KEY_ID, secretAccessKey: process.env.S3_SECRET } });
const Bucket = process.env.S3_BUCKET;
export const putUrl = (Key, ContentType) => getSignedUrl(c, new PutObjectCommand({ Bucket, Key, ContentType }), { expiresIn: 3600 });
export const getUrl = (Key, name, dl) => getSignedUrl(c, new GetObjectCommand({ Bucket, Key,
  ResponseContentDisposition: `${dl ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}` }), { expiresIn: 300 });
export const head = Key => c.send(new HeadObjectCommand({ Bucket, Key }));
export const remove = Key => c.send(new DeleteObjectCommand({ Bucket, Key }));
