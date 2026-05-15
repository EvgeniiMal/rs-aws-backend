import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CORS_HEADERS } from '../utils/cors-headers';

const ALLOWED_FILE_TYPE = 'text/csv';
export const EXPIRES_IN_SECONDS = 3600;
export const FILE_TYPE_ERROR_MESSAGE = `Only CSV files are allowed.`;
export const MISSING_NAME_ERROR_MESSAGE = `Missing "name" query parameter.`;
export const SERVER_CONFIG_ERROR_MESSAGE = 'Server configuration error.';
export const SERVER_ERROR_MESSAGE = 'Failed to create presigned URL.';

const client = new S3Client();

const createPresignedUrl = async ({ bucket, key, contentType }:
  { bucket: string; key: string; contentType: string }) => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return await getSignedUrl(client, command, { expiresIn: EXPIRES_IN_SECONDS });
};

export const importProductsFile = async (event: APIGatewayProxyEventV2) => {
  const UPLOAD_PREFIX = process.env.UPLOAD_PREFIX;
  const BUCKET_NAME = process.env.BUCKET_NAME;

  if (!UPLOAD_PREFIX || !BUCKET_NAME) {
    console.error(`Missing environment variables: UPLOAD_PREFIX=${UPLOAD_PREFIX}, BUCKET_NAME=${BUCKET_NAME}`);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: SERVER_CONFIG_ERROR_MESSAGE }),
    };
  }

  console.log('Event: ', event);

  const { name } = event.queryStringParameters || {};

  if (!name) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: MISSING_NAME_ERROR_MESSAGE }),
    };
  }

  if (!name.toLowerCase().endsWith('.csv')) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: FILE_TYPE_ERROR_MESSAGE,
      }),
    };
  }

  try {
    const presignedUrl = await createPresignedUrl({
      bucket: BUCKET_NAME,
      key: `${UPLOAD_PREFIX}/${name}`,
      contentType: ALLOWED_FILE_TYPE,
    });

    console.log('Presigned URL created: ', presignedUrl);

    return {
      statusCode: 200,
      body: presignedUrl,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/plain',
      },
    };
  } catch (error) {
    console.error('Error creating presigned URL: ', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: SERVER_ERROR_MESSAGE }),
    };
  }
};