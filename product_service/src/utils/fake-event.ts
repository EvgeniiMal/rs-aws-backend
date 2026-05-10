import path from "node:path";

export const fakeEventFields = {
  version: "2.0",
  routeKey: "ANY /{proxy+}",
  rawPath: "/test-path",
  path: "/test-path",
  rawQueryString: "",
  headers: {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "host": "test-host",
    "user-agent": "test-user-agent",
  },
  requestContext: {
    accountId: "123456789012",
    apiId: "test-api-id",
    domainName: "test-domain-name",
    domainPrefix: "test-domain-prefix",
    http: {
      method: "GET",
    },
    requestId: "test-request-id",
    routeKey: "ANY /{proxy+}",
    stage: "test-stage",
    time: "01/Jan/1970:00:00:00 +0000",
    timeEpoch: 0,
  },
  isBase64Encoded: false,
};