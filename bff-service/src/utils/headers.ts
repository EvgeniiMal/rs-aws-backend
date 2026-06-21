export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, accept',
};

export const necessaryHeaders = [
  'content-type',
  'authorization',
  'accept',
]

export const responseHeaders = {
  ...corsHeaders,
};

export const extractNecessaryHeaders = (headers: Record<string, string | string[] | undefined>): Record<string, string> => {
  const extractedHeaders: Record<string, string> = {};
  for (const header of necessaryHeaders) {
    const value = headers[header];
    if (value) {
      extractedHeaders[header] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return extractedHeaders;
};
