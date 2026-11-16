import { HttpMethod, type IAction } from '@repo/common/types';
import axios from 'axios';
import { assertPublicHost, publicOnlyLookup } from '../../../lib/safe-lookup';
import { httpRequestSchema, type HttpRequestConfig } from '../schemas';

const parseBody = (body: string) => {
  if (!body.trim()) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export const httpRequest: IAction<HttpRequestConfig> = {
  id: 'http-request',
  name: 'HTTP Request',
  description: 'Send a request to any URL',
  icon: '/icons/http-request.svg',
  schema: httpRequestSchema,

  run: async ({ metadata }) => {
    const parsed = httpRequestSchema.safeParse(metadata);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Invalid request',
        statusCode: 400,
      };
    }

    const { method, url, headers, body } = parsed.data;

    try {
      assertPublicHost(new URL(url).hostname);
      const response = await axios.request({
        method,
        url,
        headers: Object.fromEntries(headers.map((h) => [h.key, h.value])),
        data: method === HttpMethod.GET ? undefined : parseBody(body),
        timeout: 15_000,
        maxRedirects: 3,
        maxContentLength: 1_000_000,
        maxBodyLength: 1_000_000,
        lookup: publicOnlyLookup,
        beforeRedirect: (options) => assertPublicHost(options.hostname),
        validateStatus: () => true,
      });

      const success = response.status < 400;
      return {
        success,
        message: `${method} ${url} responded ${response.status}`,
        statusCode: success ? 200 : response.status,
        data: {
          status: response.status,
          body: response.data,
          headers: response.headers,
        },
      };
    } catch (error: Error | any) {
      return {
        success: false,
        message: `Request failed: ${error?.message ?? 'unknown error'}`,
        statusCode: 502,
      };
    }
  },
};
