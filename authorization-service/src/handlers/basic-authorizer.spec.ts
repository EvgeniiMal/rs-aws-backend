import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { basicAuthorizerHandler } from './basic-authorizer';
import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

describe('Basic Authorizer Handler', async () => {
  it('should return 401 if no Authorization header is provided', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:example/prod/GET/resource',
      authorizationToken: '',
    } as unknown as APIGatewayTokenAuthorizerEvent;

    await assert.rejects(() => basicAuthorizerHandler(event), {
      name: 'Error',
      message: 'Unauthorized',
    });
  });

  it('should return 403 HTTP status if access is denied for this user', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:example/prod/GET/resource',
      authorizationToken: 'Bearer invalid-token',
    } as unknown as APIGatewayTokenAuthorizerEvent;

    assert.equal(
      (await basicAuthorizerHandler(event)).policyDocument.Statement[0].Effect, 'Deny');
  });

  it('should return 200 HTTP status if access is allowed for this user', async () => {
    process.env.evgeniimal = 'testpassword';

    const credentials = Buffer.from('evgeniimal:testpassword').toString('base64');
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:example/prod/GET/resource',
      authorizationToken: `Basic ${credentials}`,
    } as unknown as APIGatewayTokenAuthorizerEvent;

    assert.equal(
      (await basicAuthorizerHandler(event)).policyDocument.Statement[0].Effect, 'Allow');
  });
});