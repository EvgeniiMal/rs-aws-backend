import { APIGatewayProxyResult } from "aws-lambda";

export const getProductList = async (): Promise<APIGatewayProxyResult> => {
  const products = await import("../data/product-list.json");

  if (!products) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Could not load products",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(products.default),
  };
};