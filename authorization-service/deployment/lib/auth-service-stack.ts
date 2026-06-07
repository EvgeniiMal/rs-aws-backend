import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
const HANDLERS_DIR = path.resolve(SRC_DIR, 'handlers');
const DEFAULT_RUNTIME = Runtime.NODEJS_24_X;

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerLambda = new NodejsFunction(this, 'BasicAuthorizerHandler', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'basic-authorizer.ts'),
      handler: 'basicAuthorizerHandler',
      runtime: DEFAULT_RUNTIME,
      environment: {
        evgeniimal: 'TEST_PASSWORD',
      }
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerLambdaArn', {
      value: basicAuthorizerLambda.functionArn,
      exportName: 'BasicAuthorizerLambdaArn',
    });
  }
}
