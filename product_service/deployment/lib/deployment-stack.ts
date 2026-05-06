import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import { getContext } from '../utils/context';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
const HANDLERS_DIR = path.resolve(SRC_DIR, 'handlers');
const DEFAULT_RUNTIME = lambda.Runtime.NODEJS_24_X;

export class DeploymentStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const context = getContext(this);

    const {
      lambdaTimeoutSeconds,
      productsTablePrimaryKey,
      productsTableName,
      stocksTablePrimaryKey,
      stocksTableName,
    } = context;

    const productTable = dynamodb.Table.fromTableName(
      this, 'ProductTable', productsTableName
    );

    const stocksTable = dynamodb.Table.fromTableName(
      this, 'StocksTable', stocksTableName
    );

    const getProductList = new NodejsFunction(this, 'GetProductList', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'product-list.ts'),
      handler: 'getProductList',
      runtime: DEFAULT_RUNTIME,
      timeout: cdk.Duration.seconds(lambdaTimeoutSeconds),
      environment: {
        PRODUCTS_TABLE_PRIMARY_KEY: productsTablePrimaryKey,
        PRODUCTS_TABLE_NAME: productTable.tableName,
        STOCKS_TABLE_PRIMARY_KEY: stocksTablePrimaryKey,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
    });

    const getProductById = new NodejsFunction(this, 'GetProductById', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'product.ts'),
      handler: 'getProduct',
      runtime: DEFAULT_RUNTIME,
      timeout: cdk.Duration.seconds(lambdaTimeoutSeconds),
      environment: {
        PRODUCTS_TABLE_PRIMARY_KEY: productsTablePrimaryKey,
        PRODUCTS_TABLE_NAME: productTable.tableName,
        STOCKS_TABLE_PRIMARY_KEY: stocksTablePrimaryKey,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
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
    const productByIdResource = productResource.addResource('{id}');

    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductList), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductById), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    productTable.grantReadData(getProductList);
    stocksTable.grantReadData(getProductList);

    productTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);
  }
}
