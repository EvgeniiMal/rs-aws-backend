#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { DeploymentStack } from '../lib/deployment-stack';

const app = new cdk.App();
new DeploymentStack(app, 'DeploymentStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
