import { test } from 'node:test';
import assert from 'node:assert';
import { getProduct } from './product';
import { APIGatewayProxyEvent } from 'aws-lambda';

test('product-handler', async (t) => {
  await t.test('should return 400 if no id is provided', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: null,
    };

    const result = await getProduct(event as APIGatewayProxyEvent);
    assert.strictEqual(result.statusCode, 400);
  });

  await t.test('should return 404 if product is not found', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { id: '999' },
    };

    const result = await getProduct(event as APIGatewayProxyEvent);
    assert.strictEqual(result.statusCode, 404);
  });

  await t.test('should return 200 if product is found', async () => {
    const testId = '1';
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { id: testId },
    };

    const result = await getProduct(event as APIGatewayProxyEvent);
    assert.strictEqual(result.statusCode, 200);

    const product = JSON.parse(result.body);
    const { id } = product;

    assert.strictEqual(id, testId);
  });
});