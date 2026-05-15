import { APIGatewayProxyEventV2 } from "aws-lambda";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export function createFakeApiEvent(
  method: HttpMethod,
  body: string | undefined = undefined,
  queryStringParameters: { [key: string]: string } = {}
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${method} /import`,
    rawPath: '/import',
    rawQueryString: Object.entries(queryStringParameters)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&'),
    queryStringParameters,
    headers: {
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'example.com',
      domainPrefix: 'example',
      http: {
        method,
        path: '/import',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'Custom User Agent String',
      },
      requestId: 'id',
      routeKey: `${method} /import`,
      stage: '$default',
      time: '12/Mar/2024:19:03:58 +0000',
      timeEpoch: 1700000000000,
    },
    body,
    isBase64Encoded: false,
  };
}