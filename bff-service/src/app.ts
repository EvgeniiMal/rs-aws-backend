import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import { extractNecessaryHeaders, responseHeaders } from './utils/headers';
import { getLogger } from './utils/logger';
import { getEnvPath } from './utils/get-env-path';
import { config } from 'dotenv';
import { sendBadGatewayResponse } from './utils/error-response';

config();

const requestMethodsWithoutBody = ['GET', 'HEAD'] as const;

const corsHeaderNames = new Set([
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'access-control-max-age',
]);


const server = createServer(async (req, res) => {
  const timestamp = new Date().toISOString();
  const reqId = randomUUID();
  const logger = getLogger(reqId);

  const { method, url } = req;

  logger.log(`Received ${method} request for ${url} at ${timestamp}`);

  if (!method || !url) {
    logger.warn(`Invalid request: missing method or URL`);
    res.writeHead(400, responseHeaders);
    res.write(JSON.stringify({ error: 'Bad Request' }));
    res.end();
    return;
  }

  if (method === 'OPTIONS') {
    logger.log(`Handling CORS preflight request for ${url}`);
    res.writeHead(204, { ...responseHeaders });
    res.end();
    return;
  }

  const originUrlObject = new URL(url || '', `http://${req.headers.host}`);

  const queryString = originUrlObject.search;
  const serviceName = originUrlObject.pathname.split('/')[1] || '';
  const targetPath = originUrlObject.pathname.split('/').slice(2).join('/');

  const upstreamServicePath = getEnvPath(serviceName);

  if (!upstreamServicePath) {
    logger.warn(`No upstream service path found for service name: ${serviceName}`);
    res.writeHead(502, responseHeaders);
    res.write(JSON.stringify({ error: 'Cannot process request' }));
    res.end();
    return;
  }

  const originalNecessaryHeaders = extractNecessaryHeaders(req.headers as Record<string, string | string[] | undefined>);

  logger.log(`Mapped service name: ${serviceName}, target path: ${targetPath}, query string: ${queryString}`);

  const upstreamUrl = `${upstreamServicePath.endsWith('/') ? upstreamServicePath.slice(0, -1) : upstreamServicePath}/${targetPath}${queryString}`;
  let serviceProtocol;

  try {
    serviceProtocol = new URL(upstreamUrl).protocol;
  } catch (error) {
    sendBadGatewayResponse(res, logger, `Invalid upstream service URL: ${upstreamUrl}`);
    return;
  }

  if (serviceProtocol !== 'http:' && serviceProtocol !== 'https:') {
    sendBadGatewayResponse(res, logger, `Unsupported protocol in upstream service URL: ${serviceProtocol}`);
    return;
  }

  const upstreamRequest = (
    serviceProtocol === 'https:' ? httpsRequest : httpRequest)
    (upstreamUrl, {
      method,
      headers: originalNecessaryHeaders,
    }, (upstreamResponse) => {
      const { statusCode, headers } = upstreamResponse;
      logger.log(`Received response from upstream service with status ${statusCode}`);

      if (!statusCode) {
        sendBadGatewayResponse(res, logger, `Upstream service did not return a status code for ${upstreamUrl}`);
        return;
      }

      const filteredUpstreamHeaders = Object.fromEntries(
        Object.entries(headers).filter(
          ([key]) => !corsHeaderNames.has(key.toLowerCase())
        )
      );

      const responseHeadersToSend = {
        ...filteredUpstreamHeaders,
        ...responseHeaders,
      };

      res.writeHead(statusCode, responseHeadersToSend);

      upstreamResponse.pipe(res);

      res.once('finish', () => {
        logger.log(`Request to ${upstreamUrl} completed with status ${statusCode}`);
      });

    });

  upstreamRequest.on('error', (err) => {
    logger.error(`Error during request to ${upstreamUrl}: ${err.message}`);
    if (!res.headersSent) {
      sendBadGatewayResponse(res, logger, `Error during request to ${upstreamUrl}: ${err.message}`);
    } else {
      logger.warn(`Response headers already sent, cannot send error response for ${upstreamUrl}`);
      res.end();
    }
  });

  if (!requestMethodsWithoutBody.includes(method as typeof requestMethodsWithoutBody[number])) {
    req.pipe(upstreamRequest);
  } else {
    upstreamRequest.end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
