import { aws_apigatewayv2 as apigV2 } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path from 'path';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { getContext } from '../utils/context';

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

    api.addRoutes({
      path: '/import',
      methods: [apigV2.HttpMethod.GET],
      integration: importProductsFileIntegration,
    });

    productsBucket.grantPut(importProductsFileLambda);
    productsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(
        parseFileLambda
      ),
      { prefix: `${uploadPrefix}/` }
    );


    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: `${api.apiEndpoint}/import`,
      description: 'Import Service API endpoint',
      exportName: `${stage}-ImportServiceApiUrl`,
    });
  }
}
