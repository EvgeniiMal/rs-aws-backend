import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { catalogBatchProcess } from "./catalog-batch-process";
import { SQSEvent } from "aws-lambda";

const ddbMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

test("should process all SQS records", async () => {
  ddbMock.reset();
  snsMock.reset();

  process.env.PRODUCTS_TABLE_NAME = "products";
  process.env.STOCKS_TABLE_NAME = "stocks";
  process.env.PRODUCTS_CREATED_TOPIC_ARN = "arn:aws:sns:eu-north-1:123456789012:productsCreatedTopic";
  process.env.AWS_REGION = "eu-north-1";

  const ids = ["product-1", "product-2"];
  let idIndex = 0;
  const randomUuidMock = mock.method(crypto, "randomUUID", () => ids[idIndex++]!);

  ddbMock.on(TransactWriteCommand).resolves({});
  snsMock.on(PublishCommand).resolves({ MessageId: "test-message-id" });

  const event: SQSEvent = {
    Records: [
      {
        messageId: "1",
        receiptHandle: "handle-1",
        body: JSON.stringify({
          title: "Product 1",
          description: "Description 1",
          price: 100,
          count: 5,
        }),
        attributes: {
          ApproximateReceiveCount: "1",
          SentTimestamp: "1",
          SenderId: "test",
          ApproximateFirstReceiveTimestamp: "1",
        },
        messageAttributes: {},
        md5OfBody: "md5",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:eu-north-1:123456789012:test",
        awsRegion: "eu-north-1",
      },
      {
        messageId: "2",
        receiptHandle: "handle-2",
        body: JSON.stringify({
          title: "Product 2",
          description: "Description 2",
          price: 200,
          count: 10,
        }),
        attributes: {
          ApproximateReceiveCount: "1",
          SentTimestamp: "1",
          SenderId: "test",
          ApproximateFirstReceiveTimestamp: "1",
        },
        messageAttributes: {},
        md5OfBody: "md5",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:eu-north-1:123456789012:test",
        awsRegion: "eu-north-1",
      },
    ],
  };

  await catalogBatchProcess(event);

  const commandCalls = ddbMock.commandCalls(TransactWriteCommand);

  assert.equal(commandCalls.length, 2);
  assert.equal(randomUuidMock.mock.calls.length, 2);

  assert.deepEqual(commandCalls[0].args[0].input, {
    TransactItems: [
      {
        Put: {
          TableName: "products",
          Item: {
            id: "product-1",
            title: "Product 1",
            description: "Description 1",
            price: 100,
          },
        },
      },
      {
        Put: {
          TableName: "stocks",
          Item: {
            product_id: "product-1",
            count: 5,
          },
        },
      },
    ],
  });

  assert.deepEqual(commandCalls[1].args[0].input, {
    TransactItems: [
      {
        Put: {
          TableName: "products",
          Item: {
            id: "product-2",
            title: "Product 2",
            description: "Description 2",
            price: 200,
          },
        },
      },
      {
        Put: {
          TableName: "stocks",
          Item: {
            product_id: "product-2",
            count: 10,
          },
        },
      },
    ],
  });
});