import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Product } from "../types/product";


const REGION = process.env.AWS_REGION || "eu-west-1";
const PRODUCTS_TABLE_NAME = "products";
const STOCKS_TABLE_NAME = "stocks";
const MAX_BATCH_SIZE = 25;

console.log({
  REGION,
  PRODUCTS_TABLE_NAME,
  STOCKS_TABLE_NAME,
});

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const createRandomProduct = (): Product => {
  const id = crypto.randomUUID();
  return {
    id,
    title: `Product ${id}`,
    description: `Description for product ${id}`,
    price: Math.floor(Math.random() * 100) + 1,
  };
};

const createRandomStock = (productId: string) => {
  return {
    product_id: productId,
    count: Math.floor(Math.random() * 100) + 1,
  };
};

const generateProducts = (count: number) => {
  return Array.from({ length: count }, () => createRandomProduct());
};

const generateStocks = (products: { id: string }[]) => {
  return products.map((product) => createRandomStock(product.id));
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result;
};

const seedDatabase = async (productCount: number) => {
  const products = generateProducts(productCount);
  const stocks = generateStocks(products);

  const productChunks = chunk(products, MAX_BATCH_SIZE);
  const stockChunks = chunk(stocks, MAX_BATCH_SIZE);

  for (const productBatch of productChunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [PRODUCTS_TABLE_NAME]: productBatch.map((product) => ({
            PutRequest: {
              Item: product,
            },
          })),
        },
      }));
  }
  console.log("Products seeded successfully.");

  for (const stockBatch of stockChunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [STOCKS_TABLE_NAME]: stockBatch.map((stock) => ({
            PutRequest: {
              Item: stock,
            },
          })),
        },
      }));
  }
  console.log("Stocks seeded successfully.");

  console.log(`Database seeded with ${productCount} products and corresponding stocks.`);
};

seedDatabase(30).catch((error) => {
  console.error("Error seeding database:", error);
});