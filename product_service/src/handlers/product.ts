import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import products from "../data/product-list.json";

export const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Product ID is required",
      }),
    };
  }

  const product = products.find((p) => String(p.id) === id);

  if (!product) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Product not found",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(product),
  };
};