import * as cdk from 'aws-cdk-lib';

type ImportServiceContext = {
  stage: string;
  productsBucketName: string;
  uploadPrefix: string;
};

const CONTEXT_KEY = "serviceContext";

const getContext = (scope: cdk.Stack): ImportServiceContext => {
  const value = scope.node.tryGetContext(CONTEXT_KEY);

  if (!value) {
    throw new Error(`CDK context "${CONTEXT_KEY}" is not defined`);
  }

  return value as ImportServiceContext;
};

export { getContext, ImportServiceContext };