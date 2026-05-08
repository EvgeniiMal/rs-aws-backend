import { test } from 'node:test';
import assert from 'node:assert';
import { getProductList } from './product-list';

test('product-list handler', async (t) => {
  await t.test('should return products list', async () => {
    const result = await getProductList();

    assert.strictEqual(result.statusCode, 200);
    assert.ok(result.body);
  });
});