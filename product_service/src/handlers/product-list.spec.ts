import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

import { getProductList } from "./product-list";
import { fakeEventFields } from "../utils/fake-event";
import { APIGatewayProxyEvent } from "aws-lambda";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("product-list handler", () => {
  beforeEach(() => {
    ddbMock.reset();

    process.env.PRODUCTS_TABLE_NAME = "products";
    process.env.STOCKS_TABLE_NAME = "stocks";
    process.env.PRODUCTS_TABLE_PRIMARY_KEY = "id";
    process.env.STOCKS_TABLE_PRIMARY_KEY = "product_id";
  });

  it("should return products with count", async () => {
    ddbMock
      .on(ScanCommand, {
        TableName: process.env.PRODUCTS_TABLE_NAME,
      })
      .resolves({
        Items: [
          { id: "1", title: "Product 1", price: 100 },
          { id: "2", title: "Product 2", price: 200 },
          { id: "3", title: "Product 3", price: 300 },
          { id: "4", title: "Product 4", price: 400 },
          { id: "5", title: "Product 5", price: 500 },
        ],
      });

    ddbMock
      .on(BatchGetCommand)
      .resolves({
        Responses: {
          [process.env.STOCKS_TABLE_NAME!]: [
            { product_id: "1", count: 5 },
            { product_id: "2", count: 10 },
            { product_id: "3", count: 15 },
            { product_id: "4", count: 20 },
            { product_id: "5", count: 25 },
          ],
        },
      });

    const mockEvent = {
      ...fakeEventFields,
      httpMethod: "GET",
    } as unknown as APIGatewayProxyEvent;

    const result = await getProductList(mockEvent);

    assert.equal(result.statusCode, 200);

    assert.deepEqual(JSON.parse(result.body), [
      { id: "1", title: "Product 1", price: 100, count: 5 },
      { id: "2", title: "Product 2", price: 200, count: 10 },
      { id: "3", title: "Product 3", price: 300, count: 15 },
      { id: "4", title: "Product 4", price: 400, count: 20 },
      { id: "5", title: "Product 5", price: 500, count: 25 },
    ]);
  });
});