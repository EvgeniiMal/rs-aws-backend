import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchGetCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { getProduct } from "./product";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("product handler", () => {
  beforeEach(() => {
    ddbMock.reset();

    process.env.PRODUCTS_TABLE_NAME = "products";
    process.env.STOCKS_TABLE_NAME = "stocks";
    process.env.PRODUCTS_TABLE_PRIMARY_KEY = "id";
    process.env.STOCKS_TABLE_PRIMARY_KEY = "product_id";
  });

  it("should return product with count", async () => {
    const productId = crypto.randomUUID();
    const mockEvent = { pathParameters: { id: productId } } as unknown as AWSLambda.APIGatewayProxyEvent;

    ddbMock
      .on(GetCommand, {
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: {
          [process.env.PRODUCTS_TABLE_PRIMARY_KEY!]: productId,
        },
      })
      .resolves({
        Item: { id: productId, title: "Product 1", price: 100 },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.STOCKS_TABLE_NAME,
        Key: {
          [process.env.STOCKS_TABLE_PRIMARY_KEY!]: productId,
        },
      })
      .resolves({
        Item: { product_id: productId, count: 5 },
      });

    const result = await getProduct(mockEvent);

    assert.equal(result.statusCode, 200);

    assert.deepEqual(JSON.parse(result.body), {
      id: productId,
      title: "Product 1",
      price: 100,
      count: 5,
    });
  });

  it("should return 404 if product not found", async () => {
    const productId = crypto.randomUUID();
    const mockEvent = { pathParameters: { id: productId } } as unknown as AWSLambda.APIGatewayProxyEvent;

    ddbMock
      .on(GetCommand, {
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: {
          [process.env.PRODUCTS_TABLE_PRIMARY_KEY!]: productId,
        },
      })
      .resolves({ Item: undefined });

    const result = await getProduct(mockEvent);

    assert.equal(result.statusCode, 404);
    assert.deepEqual(JSON.parse(result.body), {
      message: "Product not found",
    });
  });

  it("should return 400 for invalid product id", async () => {
    const mockEvent = { pathParameters: { id: "invalid-uuid" } } as unknown as AWSLambda.APIGatewayProxyEvent;

    const result = await getProduct(mockEvent);

    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      message: "Invalid product id",
    });
  });
});