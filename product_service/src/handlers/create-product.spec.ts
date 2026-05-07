import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";


import { createProductHandler } from "./create-product";
import { APIGatewayProxyEvent } from "aws-lambda";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("create-product handler", () => {
  beforeEach(() => {
    ddbMock.reset();

    process.env.PRODUCTS_TABLE_NAME = "products";
    process.env.STOCKS_TABLE_NAME = "stocks";
    process.env.PRODUCTS_TABLE_PRIMARY_KEY = "id";
    process.env.STOCKS_TABLE_PRIMARY_KEY = "product_id";
  });

  it("should create a product and return 201 status code", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});

    const event = {
      body: JSON.stringify({
        name: "Test Product",
        price: 100,
        count: 10,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 201);
    assert.deepEqual(JSON.parse(result.body), {
      message: "Product created successfully",
    });
  });
  it("should return 400 status code for invalid product data", async () => {
    const event = {
      body: JSON.stringify({
        name: "Test Product",
        price: "invalid_price",
        count: 10,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      error: "Invalid product data",
    });
  });

  it("should return 500 status code for database errors", async () => {
    ddbMock.on(TransactWriteCommand).rejects(new Error("Database error"));

    const event = {
      body: JSON.stringify({
        name: "Test Product",
        price: 100,
        count: 10,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 500);
    assert.deepEqual(JSON.parse(result.body), {
      error: "Failed to create product",
    });
  });
});