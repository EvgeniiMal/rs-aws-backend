import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import zod from "zod";
import { corsHeaders } from "../utils/cors-headers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CreateProduct } from "../types/product";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);

const productDataSchema = zod.object({
  title: zod.string(),
  description: zod.string(),
  price: zod.number(),
  count: zod.number(),
}).strict() satisfies zod.ZodType<CreateProduct>;

export const createProductHandler =
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestBody = JSON.parse(event.body || "{}");
    const parseResult = productDataSchema.safeParse(requestBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      console.warn("Invalid product data:", errorMessage);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Invalid product data",
        }),
      };
    }

    const product = parseResult.data;
    const productId = crypto.randomUUID();

    const { title, description, price, count } = product;

    try {
      await dynamoDb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: process.env.PRODUCTS_TABLE_NAME!,
                Item: {
                  id: productId,
                  title,
                  description,
                  price,
                },
              },
            },
            {
              Put: {
                TableName: process.env.STOCKS_TABLE_NAME!,
                Item: {
                  product_id: productId,
                  count,
                },
              },
            },
          ],
        })
      );

      console.info(`Product created successfully: ${productId}`);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ id: productId, message: "Product created successfully" }),
      };
    } catch (error) {
      console.error("Error creating product:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Failed to create product",
        }),
      };
    }
  };