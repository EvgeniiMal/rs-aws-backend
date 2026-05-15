import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable } from "stream";

export const PROCESSING_ERROR_MESSAGE = 'Error processing file.';
export const PARSING_ERROR_MESSAGE = 'Error parsing CSV file.';

const s3Client = new S3Client({});

export const fileParser = async (event: S3Event) => {
  const record = event.Records[0];
  const bucketName = record.s3.bucket.name;
  const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  try {
    const getObjectParams = {
      Bucket: bucketName,
      Key: objectKey,
    };
    const response = await s3Client.send(new GetObjectCommand(getObjectParams));
    const stream = response.Body as Readable;

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          console.log('Parsed CSV row: ', data);
        })
        .on('end', () => {
          console.log('Finished processing CSV file.');
          resolve(null);
        })
        .on('error', (error) => {
          console.error(PARSING_ERROR_MESSAGE, error);
          reject(error);
        });
    });

  } catch (error) {
    console.error(PROCESSING_ERROR_MESSAGE, error);
    return
  }
  return
};