import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable, Transform } from "stream";
import { deleteFile, copyFile } from "../utils/s3-file-operations";
import sendSqsMessage from "../service/sqs/send-sqs-message";


export const S3_OBJECT_EMPTY_MESSAGE = 'S3 object body is empty.';
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

    if (!response.Body) {
      throw new Error(S3_OBJECT_EMPTY_MESSAGE);
    }

    const messagePromises: Promise<void>[] = [];

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(new Transform({
          transform(chunk, encoding, callback) {
            callback(null, chunk.toString().replace(/,/g, ';'));
          }
        }))
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          console.log('Parsed CSV row: ', data);
          const message = JSON.stringify(data);
          messagePromises.push(sendSqsMessage(message));
        })
        .on('end', resolve)
        .on('error', (error) => {
          console.error(PARSING_ERROR_MESSAGE, error);
          reject(error);
        });
    })

    await Promise.all(messagePromises);

    console.log(`Finished processing file from S3 ${bucketName}/${objectKey}.`);

    await copyFile(
      objectKey,
      `${PROCESSED_DIRECTORY}${fileName}`,
      bucketName);
    await deleteFile(objectKey, bucketName);

  } catch (error) {
    console.error(PROCESSING_ERROR_MESSAGE, error);
    throw error;
  }
};