import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import products from "../data/product-list.json";
import { corsHeaders } from "../utils/cors-headers";

export const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const product = products.find((p) => String(p.id) === id);

  if (!product) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Product not found",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(product),
  };
};