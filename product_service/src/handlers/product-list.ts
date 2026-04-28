import { APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../utils/cors-headers";

export const getProductList = async (): Promise<APIGatewayProxyResult> => {
  const products = await import("../data/product-list.json");

  if (!products) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Could not load products",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(products.default),
  };
};