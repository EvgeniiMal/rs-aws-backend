import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../utils/cors-headers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Product, ProductItemsList } from "../types/product";
import { StockList } from "../types/stock";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);

export const getProductList = async (event: APIGatewayProxyEvent):
  Promise<APIGatewayProxyResult> => {
  const { requestContext, httpMethod } = event;
  const requestId = requestContext.requestId;

  console.log({
    msg: 'incoming request',
    requestId,
    method: httpMethod,
  });

  try {
    const productsResult = await dynamoDb.send(
      new ScanCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
      })
    )
    const products = productsResult.Items as Product[] ?? [];

    console.log(`Products query: ${products.length} product items received from DynamoDB`);

    if (products.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(products),
      };
    }

    const productIds = products.map((product) => product.id);


    const stocksResult = await dynamoDb.send(
      new BatchGetCommand({
        RequestItems: {
          [process.env.STOCKS_TABLE_NAME!]: {
            Keys: productIds.map((id) => ({
              product_id: id,
            })),
          },
        },
      })
    )

    const stocks = stocksResult?.Responses?.[process.env.STOCKS_TABLE_NAME!] as StockList ?? [];

    console.log(`Stocks query: ${stocks.length} stock items received from DynamoDB`);

    const fullProducts: ProductItemsList = products.map((product) => {
      const stock = stocks.find((s) => s.product_id === product.id);
      return {
        ...product,
        count: stock ? stock.count : 0,
      }
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(fullProducts),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  return {
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify({
      message: "Could not load products",
    }),
  };
};