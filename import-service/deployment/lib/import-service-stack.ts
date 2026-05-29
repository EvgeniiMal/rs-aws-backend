import { aws_apigatewayv2 as apigV2 } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path from 'path';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { getContext } from '../utils/context';
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
const HANDLERS_DIR = path.resolve(SRC_DIR, 'handlers');
const DEFAULT_RUNTIME = lambda.Runtime.NODEJS_24_X;

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const { stage, productsBucketName, uploadPrefix } = getContext(this);

    const productsBucket = s3.Bucket.fromBucketName(
      this, 'ProductsBucket', productsBucketName
    );

    const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');
    const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
    const basicAuthorizerLambdaArn = cdk.Fn.importValue('BasicAuthorizerLambdaArn');

    const catalogItemsQueue = sqs.Queue.fromQueueAttributes(this, 'CatalogItemsQueue', {
      queueUrl: catalogItemsQueueUrl,
      queueArn: catalogItemsQueueArn,
    });

    const importProductsFileLambda = new NodejsFunction(
      this, 'ImportProductsFileLambda', {
      projectRoot: PROJECT_ROOT,
      entry: path.join(HANDLERS_DIR, 'import-products-file.ts'),
      handler: 'importProductsFile',
      runtime: DEFAULT_RUNTIME,
      environment: {
        BUCKET_NAME: productsBucketName,
        UPLOAD_PREFIX: uploadPrefix,
      },
    });

    const parseFileLambda = new NodejsFunction(
      this, 'ParseFileLambda', {
      projectRoot: PROJECT_ROOT,
      entry: path.join(HANDLERS_DIR, 'file-parser.ts'),
      handler: 'fileParser',
      runtime: DEFAULT_RUNTIME,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    const importProductsFileIntegration = new HttpLambdaIntegration(
      'ImportProductsFileIntegration',
      importProductsFileLambda,
    );

    const api = new apigV2.HttpApi(this, 'ImportServiceApi', {
      apiName: 'Import Service API',
      description: 'API for importing product files',
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [
          apigV2.CorsHttpMethod.GET,
          apigV2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(10),
      },
    });

    const basicAuthorizerLambda = lambda.Function.fromFunctionAttributes(
      this, 'BasicAuthorizerLambda', {
      functionArn: basicAuthorizerLambdaArn,
      sameEnvironment: true,
    }
    );

    const basicAuthorizer = new HttpLambdaAuthorizer(
      'BasicAuthorizer',
      basicAuthorizerLambda,
      {
        responseTypes: [HttpLambdaResponseType.SIMPLE],
        identitySource: ['$request.header.Authorization'],
      }
    )

    api.addRoutes({
      path: '/import',
      methods: [apigV2.HttpMethod.GET],
      integration: importProductsFileIntegration,
      authorizer: basicAuthorizer,
    });

    productsBucket.grantPut(importProductsFileLambda);
    productsBucket.grantReadWrite(parseFileLambda);
    productsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(
        parseFileLambda
      ),
      { prefix: `${uploadPrefix}/`, suffix: '.csv' }
    );

    catalogItemsQueue.grantSendMessages(parseFileLambda);

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: `${api.apiEndpoint}/import`,
      description: 'Import Service API endpoint',
      exportName: `${stage}-ImportServiceApiUrl`,

    });

  }
}
