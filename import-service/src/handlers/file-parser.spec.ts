import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { S3Event } from "aws-lambda";
import { fileParser } from "./file-parser";
import { Readable } from "node:stream";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";

const s3Mock = mockClient(S3Client);
const mockEvent = {
  Records: [
    {
      s3: {
        bucket: {
          name: "test-bucket",
        },
        object: {
          key: "test-file.csv",
        },
      },
    },
  ],
} as unknown as S3Event;

describe("fileParser", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('should process the S3 event and parse the CSV file', async () => {
    const csvStream = Readable.from([
      'title,description,price,count\n',
      'Test product,Some description,10,5\n',
    ]);

    s3Mock.on(GetObjectCommand).resolves({
      Body: csvStream,
    } as any);

    await fileParser(mockEvent);

    assert.equal(s3Mock.commandCalls(GetObjectCommand).length, 1);
    assert.ok(true);
  });

  it('should copy the file to the "parsed" directory and delete the original file',
    async () => {
      const csvStream = Readable.from([
        'title,description,price,count\n',
        'Test product,Some description,10,5\n',
      ]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: csvStream,
      } as any);

      await fileParser(mockEvent);

      assert.equal(s3Mock.commandCalls(GetObjectCommand).length, 1);
      assert.equal(s3Mock.commandCalls(CopyObjectCommand).length, 1);
      assert.equal(s3Mock.commandCalls(DeleteObjectCommand).length, 1);
    });
});
