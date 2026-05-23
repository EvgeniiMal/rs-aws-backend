import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { EXPIRES_IN_SECONDS, FILE_TYPE_ERROR_MESSAGE, importProductsFile, SERVER_CONFIG_ERROR_MESSAGE } from "./import-products-file";
import { createFakeApiEvent } from "../utils/fake-event";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client } from "@aws-sdk/client-s3";

const s3Mock = mockClient(S3Client);

const REGION = 'eu-west-1';
const BUCKET_NAME = 'test-bucket';
const UPLOAD_PREFIX = 'test-prefix';

describe("importProductsFile", () => {
  beforeEach(() => {
    process.env.AWS_REGION = REGION;
    process.env.BUCKET_NAME = BUCKET_NAME;
    process.env.UPLOAD_PREFIX = UPLOAD_PREFIX;
  });

  it("should return 400 if name query parameter is missing", async () => {
    const event = {
      queryStringParameters: {},
    } as APIGatewayProxyEventV2;

    const response = await importProductsFile(event);

    assert.strictEqual(response.statusCode, 400);
    assert.deepStrictEqual(JSON.parse(response.body), { message: 'Missing "name" query parameter.' });
  });

  it("should return 400 if file type is not csv", async () => {
    const event = createFakeApiEvent('GET', undefined, { name: 'file.txt' });

    const response = await importProductsFile(event);

    assert.strictEqual(response.statusCode, 400);
    assert.deepStrictEqual(JSON.parse(response.body), { message: FILE_TYPE_ERROR_MESSAGE });
  });

  it("should return 200 and a presigned URL if file type is csv", async () => {
    s3Mock.onAnyCommand().resolves({});
    const event = createFakeApiEvent('GET', undefined, { name: 'file.csv' });

    const response = await importProductsFile(event);

    assert.strictEqual(response.statusCode, 200);
    assert.ok(response.body.includes('https://'));
  });

  it("should return 200 and a proper presigned URL if file type is CSV (case insensitive)", async () => {
    s3Mock.onAnyCommand().resolves({});
    const FAKE_FILE_NAME = 'file.CSV';
    const event = createFakeApiEvent('GET', undefined, { name: FAKE_FILE_NAME });

    const response = await importProductsFile(event);
    assert.strictEqual(response.statusCode, 200);
    assert.ok(response.body.includes('https://'));
    assert.ok(response.body.includes(FAKE_FILE_NAME));
    assert.ok(response.body.includes(`Expires=${EXPIRES_IN_SECONDS}`));
  });

  it("should return 500 if environment variables are missing", async () => {
    delete process.env.BUCKET_NAME;
    delete process.env.UPLOAD_PREFIX;
    const event = createFakeApiEvent('GET', undefined, { name: 'file.csv' });

    const response = await importProductsFile(event);

    assert.strictEqual(response.statusCode, 500);
    assert.deepStrictEqual(JSON.parse(response.body), { message: SERVER_CONFIG_ERROR_MESSAGE });
  });
});