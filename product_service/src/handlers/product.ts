import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../utils/cors-headers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import zod from "zod";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);
const pathSchema = zod.object({
  id: zod.uuid(),
});

export const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { pathParameters, path, httpMethod, requestContext } = event;
  const requestId = requestContext.requestId;

  console.log({
    msg: 'incoming request',
    requestId,
    method: httpMethod,
    path,
    pathParameters,
  });

  const result = pathSchema.safeParse(event.pathParameters);

  if (!result.success) {
    console.warn("Invalid product id:", event.pathParameters?.id);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Invalid product id",
      }),
    };
  }

  const productId = result.data.id;

  const getProductCommand = new GetCommand({
    TableName: process.env.PRODUCTS_TABLE_NAME!,
    Key: {
      [process.env.PRODUCTS_TABLE_PRIMARY_KEY!]: productId,
    },
  });

  const getProductStockCommand = new GetCommand({
    TableName: process.env.STOCKS_TABLE_NAME!,
    Key: {
      [process.env.STOCKS_TABLE_PRIMARY_KEY!]: productId,
    },
  });

  try {
    const productResult = await dynamoDb.send(getProductCommand);
    const product = productResult.Item;

    if (!product) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Product not found",
        }),
      };
    }

    const stockResult = await dynamoDb.send(getProductStockCommand);
    const stock = stockResult.Item;

    const fullProduct = {
      ...product,
      count: stock ? stock.count : 0,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(fullProduct),
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};

