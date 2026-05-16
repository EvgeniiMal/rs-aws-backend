import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable } from "stream";
import { deleteFile, copyFile } from "../utils/s3-file-operations";

export const PROCESSING_ERROR_MESSAGE = 'Error processing file.';
export const PARSING_ERROR_MESSAGE = 'Error parsing CSV file.';
export const UNSUPPORTED_FILE_TYPE_MESSAGE = 'Unsupported file type. Only CSV files are supported.';

export const PROCESSED_DIRECTORY = 'parsed/';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const fileParser = async (event: S3Event) => {
  const record = event.Records[0];
  const bucketName = record.s3.bucket.name;
  const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const fileName = objectKey.split('/').pop();

  console.log(`Received S3 event for file: ${fileName} in bucket: ${bucketName}`);

  const fileExtension = objectKey.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'csv') {
    console.error(UNSUPPORTED_FILE_TYPE_MESSAGE);
    return;
  }

  try {
    const getObjectParams = {
      Bucket: bucketName,
      Key: objectKey,
    };
    const response = await s3Client.send(new GetObjectCommand(getObjectParams));
    const stream = response.Body as Readable;

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          console.log('Parsed CSV row: ', data);
        })
        .on('end', resolve)
        .on('error', (error) => {
          console.error(PARSING_ERROR_MESSAGE, error);
          reject(error);
        });
    })

    console.log(`Finished processing file from S3 ${bucketName}/${objectKey}.`);

    await copyFile(
      `${bucketName}/${objectKey}`,
      `${PROCESSED_DIRECTORY}${fileName}`,
      bucketName);
    await deleteFile(objectKey, bucketName);

  } catch (error) {
    console.error(PROCESSING_ERROR_MESSAGE, error);
    return
  }
  return
};