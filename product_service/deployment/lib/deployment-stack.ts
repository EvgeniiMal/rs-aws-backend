import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
const HANDLERS_DIR = path.resolve(SRC_DIR, 'handlers');

export class DeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductList = new NodejsFunction(this, 'GetProductList', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'product-list.ts'),
      handler: 'getProductList',
      runtime: DEFAULT_RUNTIME,
      timeout: cdk.Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
    });

    const getProductById = new NodejsFunction(this, 'GetProductById', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'product.ts'),
      handler: 'getProductById',
      runtime: DEFAULT_RUNTIME,
      timeout: cdk.Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
    });

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
      restApiName: 'Products Service',
      description: 'This service serves products information.',
    });

    const productResource = api.root.addResource('products');

    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductList), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
  }
}
