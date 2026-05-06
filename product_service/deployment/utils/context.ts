import * as cdk from 'aws-cdk-lib';

type ProductServiceContext = {
  lambdaTimeoutSeconds: number;
  productsTablePrimaryKey: string;
  productsTableName: string;
  stocksTablePrimaryKey: string;
  stocksTableName: string;
};

const CONTEXT_KEY = "serviceContext";

const getContext = (scope: cdk.Stack): ProductServiceContext => {
  const value = scope.node.tryGetContext(CONTEXT_KEY);

  if (!value) {
    throw new Error(`CDK context "${CONTEXT_KEY}" is not defined`);
  }

  return value as ProductServiceContext;
};

export { getContext, ProductServiceContext };