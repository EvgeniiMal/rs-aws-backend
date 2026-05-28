import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../utils/cors-headers";
import zod from "zod";
import { CreateProduct } from "../types/product";
import createProduct from "../service/create-product";

const client = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(client);

const productDataSchema = zod.object({
  title: zod.string(),
  description: zod.string(),
  price: zod.number().positive(),
  count: zod.number().positive().int(),
}).strict() satisfies zod.ZodType<CreateProduct>;

export const createProductHandler =
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { requestContext, httpMethod, path } = event;
    const requestId = requestContext.requestId;

    console.log({
      msg: 'incoming request',
      requestId,
      method: httpMethod,
      path,
      body: event.body,
    });

    const productDataSchema = zod.object({
      title: zod.string(),
      description: zod.string(),
      price: zod.number(),
      count: zod.number(),
    }).strict() satisfies zod.ZodType<CreateProduct>;
    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
      console.warn("Invalid JSON in request body:", error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Invalid JSON in request body",
        }),
      };
    }

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


    const { title, description, price, count } = product;

    try {
      const productId = await createProduct({
        title,
        description,
        price,
        count,
      });

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