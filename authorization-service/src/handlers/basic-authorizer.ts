import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

const getPolicy = (principalId: string, effect: string, resource: string) => ({
  "principalId": principalId,
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "execute-api:Invoke",
        "Effect": effect,
        "Resource": resource
      }
    ]
  }
});

export const NO_AUTH_TOKEN_ERROR = 'Unauthorized';
const INVALID_AUTH_TOKEN_ERROR_LOG = 'Invalid auth token';
const NO_AUTH_TOKEN_ERROR_LOG = 'No auth token provided';

export const basicAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent) => {
  console.log('Received request to: ', event.methodArn);

  const authToken = event.authorizationToken;

  if (!authToken) {
    console.log(NO_AUTH_TOKEN_ERROR_LOG);
    throw new Error(NO_AUTH_TOKEN_ERROR);
  }

  const tokenParts = authToken.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'basic') {
    console.log(INVALID_AUTH_TOKEN_ERROR_LOG);
    return getPolicy('user', 'Deny', event.methodArn);
  }

  const encodedCredentials = tokenParts[1];
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
  const [username, password] = decodedCredentials.split(':');

  if (process.env[username] === password) {
    return getPolicy(username, 'Allow', event.methodArn);
  } else {
    return getPolicy(username, 'Deny', event.methodArn);
  }
};