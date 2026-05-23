import { CreateProduct } from "../types/product";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);



export default async function createProduct(product: CreateProduct) {
  const productId = crypto.randomUUID();
  const { title, description, price, count } = product;

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
              price: +price,
            },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE_NAME!,
            Item: {
              product_id: productId,
              count: +count,
            },
          },
        },
      ],
    })
  );
  console.info(`Product created successfully: ${productId}`);
  return productId;
}