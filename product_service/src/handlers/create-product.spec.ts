import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";


import { createProductHandler } from "./create-product";
import { APIGatewayProxyEvent } from "aws-lambda";
import { fakeEventFields } from "../utils/fake-event";

const ddbMock = mockClient(DynamoDBDocumentClient);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const successfulMessage = "Product created successfully";

    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
        price: 100,
        count: 10,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 201);
    const responseBody = JSON.parse(result.body);
    assert.ok(responseBody.id);
    assert.ok(responseBody.message);

    const { id, message } = responseBody;

    assert.match(id, UUID_REGEX);
    assert.equal(message, successfulMessage);

  });
  it("should return 400 status code for invalid product data", async () => {
    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
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
  it("should return 400 status code for missing product data", async () => {
    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
        price: 100,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      error: "Invalid product data",
    });
  });
  it("should return 400 status code for invalid JSON in request body", async () => {
    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: "{title: 'Test Product',description: 'A product for testing',price: 100count: 10,}",
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      error: "Invalid JSON in request body",
    });
  });
  it("should return 400 status code for negative price and count", async () => {
    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
        price: -100,
        count: -10,
      }),
    };

    const result = await createProductHandler(event as unknown as APIGatewayProxyEvent);

    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      error: "Invalid product data",
    });
  });
  it("should return 400 status code for non-integer count", async () => {
    const event = {
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
        price: 100,
        count: 10.5,
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
      ...fakeEventFields,
      httpMethod: "POST",
      body: JSON.stringify({
        title: "Test Product",
        description: "A product for testing",
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