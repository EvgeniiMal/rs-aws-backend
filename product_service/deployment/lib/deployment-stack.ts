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

    const helloLambda = new NodejsFunction(this, 'HelloLambda', {
      projectRoot: PROJECT_ROOT,
      entry: path.resolve(HANDLERS_DIR, 'hello.handler.ts'),
      handler: 'helloHandler',
      runtime: lambda.Runtime.NODEJS_24_X,
    });
  }
}
