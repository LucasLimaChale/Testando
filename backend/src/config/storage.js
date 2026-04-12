const { S3Client, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET     = process.env.CF_R2_BUCKET      || 'videos-approval';
const PUBLIC_URL = process.env.CF_R2_PUBLIC_URL;

async function uploadFile(buffer, key, contentType) {
  await R2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${key}`;
}

async function deleteFiles(keys) {
  if (!keys || !keys.length) return;
  await R2.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: keys.map(k => ({ Key: k })) },
  }));
}

module.exports = { uploadFile, deleteFiles };
