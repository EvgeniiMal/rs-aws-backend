import { SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import createProduct from "../service/create-product";

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export const catalogBatchProcess = async (event: SQSEvent) => {
  const records = event.Records;

  console.log('Received event with records: ', records);

  const inStockCount = records.filter(record => {
    const body = JSON.parse(record.body);
    return +body.count > 0;
  }).length;

  const outOfStockCount = records.filter(record => {
    const body = JSON.parse(record.body);
    return +body.count === 0;
  }).length;

  console.log(`In-stock products count: ${inStockCount}, 
               Out-of-stock products count: ${outOfStockCount}`);

  try {
    for (const record of records) {
      const body = JSON.parse(record.body);
      const { title, description, price, count } = body;
      const productId = await createProduct({
        title,
        description,
        price,
        count,
      });
      console.info(`Product created successfully from batch: ${productId}`);
    }
  } catch (error) {
    console.error('Error processing batch: ', error);
    throw error;
  }

  if (inStockCount > 0) {
    console.log(`Publishing in-stock products message: ${inStockCount} products in stock.`);
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.PRODUCTS_CREATED_TOPIC_ARN,
        Subject: "Products in stock",
        Message: JSON.stringify({
          stockStatus: "in_stock",
          count: `There are ${inStockCount} new products in stock.`,
        }),
        MessageAttributes: {
          stockStatus: {
            DataType: "String",
            StringValue: "in_stock",
          },
        },
      })
    );
  }

  if (outOfStockCount > 0) {
    console.log(`Publishing out-of-stock products message: ${outOfStockCount} products out of stock.`);
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.PRODUCTS_CREATED_TOPIC_ARN,
        Subject: "Products out of stock",
        Message: JSON.stringify({
          stockStatus: "out_of_stock",
          count: `There are ${outOfStockCount} new products, but they are out of stock.`,
        }),
        MessageAttributes: {
          stockStatus: {
            DataType: "String",
            StringValue: "out_of_stock",
          },
        },
      })
    );
  }
};