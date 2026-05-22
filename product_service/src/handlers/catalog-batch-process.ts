import { SQSEvent } from "aws-lambda";
import createProduct from "../service/create-product";

export const catalogBatchProcess = async (event: SQSEvent) => {
  const records = event.Records;

  console.log('Received event with records: ', records);

  try {
    for (const record of records) {
      console.log('Processing record: ', record);
      const body = JSON.parse(record.body);
      console.log('Record body parsed: ', body);
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
};