import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../utils/cors-headers";
import { isUUID } from "../utils/validate-uuid";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);

export const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  if (!id || !isUUID(id)) {
    console.warn("Invalid product id:", id);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Invalid product id",
      }),
    };
  }

  const getProductCommand = new GetCommand({
    TableName: process.env.PRODUCTS_TABLE_NAME!,
    Key: {
      [process.env.PRODUCTS_TABLE_PRIMARY_KEY!]: id,
    },
  });

  const getProductStockCommand = new GetCommand({
    TableName: process.env.STOCKS_TABLE_NAME!,
    Key: {
      [process.env.STOCKS_TABLE_PRIMARY_KEY!]: id,
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

