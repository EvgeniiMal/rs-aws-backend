import { CopyObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const PROCESSING_ERROR_MESSAGE = 'Error processing file.';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const encodeS3CopySource = (bucket: string, key: string) => {
  return `${bucket}/${encodeURIComponent(key)}`;
};

const logAndThrowError = (message: string, error: unknown) => {
  console.error(message, error);
  if (error instanceof Error) {
    throw error;
  } else {
    throw new Error(message);
  }
};

export const copyFile = async (sourceKey: string, destinationKey: string, bucket: string) => {
  console.log(`Copying file from '${sourceKey}' to '${destinationKey}' in bucket '${bucket}'...`);
  try {
    await s3Client.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeS3CopySource(bucket, sourceKey),
      Key: destinationKey,
    }));
    console.log(`File copied to '${destinationKey}' in bucket '${bucket}'.`);
  } catch (error) {
    logAndThrowError(PROCESSING_ERROR_MESSAGE, error);
  }
};
export const deleteFile = async (key: string, bucket: string) => {
  console.log(`Deleting file from S3 ${bucket}/${key}...`);
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    console.log(`File deleted from S3 ${bucket}/${key}.`);
  } catch (error) {
    logAndThrowError(PROCESSING_ERROR_MESSAGE, error);
  }
};

export const moveFile = async (bucket: string, sourceKey: string, destinationKey: string) => {
  console.log(`Moving file from '${sourceKey}' to '${destinationKey}' in bucket '${bucket}'...`);
  try {
    await copyFile(sourceKey, destinationKey, bucket);
    await deleteFile(sourceKey, bucket);
    console.log(`File moved from '${sourceKey}' to '${destinationKey}' in bucket '${bucket}'.`);
  } catch (error) {
    logAndThrowError(PROCESSING_ERROR_MESSAGE, error);
  }
};
