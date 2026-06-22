import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import { extractNecessaryHeaders, responseHeaders } from './utils/headers';
import { getLogger } from './utils/logger';
import { getEnvPath } from './utils/get-env-path';
import { config } from 'dotenv';
import { sendBadGatewayResponse } from './utils/error-response';
import { cacheData, getCachedData } from './utils/cache';

config();

const requestMethodsWithoutBody = ['GET', 'HEAD'] as const;
const CACHED_RESPONSE_UPSTREAM_URL = process.env.CACHED_RESPONSE_UPSTREAM_URL || '';

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

  res.once('finish', () => {
    logger.log(`Request ${method} ${url} completed with status ${res.statusCode}`);
  });


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

  const normalizedUpstreamServicePath = upstreamServicePath.endsWith('/')
    ? upstreamServicePath.slice(0, -1)
    : upstreamServicePath;

  const pathSuffix = targetPath ? `/${targetPath}` : '';

  const upstreamUrl = `${normalizedUpstreamServicePath}${pathSuffix}${queryString}`;

  logger.log(`Constructed upstream URL: ${upstreamUrl}`);
  logger.log(`${CACHED_RESPONSE_UPSTREAM_URL ? `Cached response URL: ${CACHED_RESPONSE_UPSTREAM_URL}` : 'No cached response URL configured'}`);

  if (
    upstreamUrl === CACHED_RESPONSE_UPSTREAM_URL
    && method === 'GET'
  ) {
    const cachedResponse = getCachedData(upstreamUrl, logger);
    if (cachedResponse) {
      res.writeHead(200, cachedResponse.headers);
      res.write(cachedResponse.value);
      res.end();
      logger.log(`Served response from cache for ${upstreamUrl}`);
      return;
    }
  }


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

      if (upstreamUrl === CACHED_RESPONSE_UPSTREAM_URL && method === 'GET' && statusCode === 200) {
        const chunks: Buffer[] = [];
        upstreamResponse.on('data', (chunk) => {
          chunks.push(chunk);
        });
        upstreamResponse.on('end', () => {
          const responseData = Buffer.concat(chunks).toString();
          cacheData(upstreamUrl, responseHeadersToSend, responseData, logger);
        });
      }

      res.writeHead(statusCode, responseHeadersToSend);

      upstreamResponse.pipe(res);
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
