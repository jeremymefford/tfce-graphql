import axios, { AxiosInstance } from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { applicationConfiguration } from './conf';

export const axiosClient: AxiosInstance = axios.create({
  baseURL: applicationConfiguration.tfeBaseUrl,
  headers: {
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${applicationConfiguration.tfcToken}`,
  }
});

axiosClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  if (!error.response || error.response.status < 500 || error.response.status >= 600) {
    return Promise.reject(error);
  }

  const config = error.config as AxiosRequestConfig & { _retryCount?: number };

  const method = config.method?.toUpperCase();
  const queryStr = typeof config.data === 'object' && typeof config.data?.query === 'string'
    ? config.data.query : '';
  const isMutation = /\bmutation\b\s+(\w+)?\s*(\([^)]*\))?\s*\{/i.test(queryStr);

  const isRetryableMethod = method === 'GET' || (
    method === 'POST' && !isMutation);

  if (!isRetryableMethod) {
    return Promise.reject(error);
  }

  config._retryCount = (config._retryCount || 0) + 1;
  if (config._retryCount <= applicationConfiguration.serverErrorMaxRetries) {
    const retryDelay = applicationConfiguration.serverErrorRetryDelay;
    console.debug(`Server error occurred. Retry attempt #${config._retryCount} in ${retryDelay}ms`);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(axiosClient(config));
      }, retryDelay);
    });
  }
  // If we reach here, we've exhausted retries
  if (error.response) {
    console.error(`Server error continued after ${config._retryCount} retries: ${error.response.status} ${error.response.statusText}`);
  }

  return Promise.reject(error);
});

axiosClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  if (error.response?.status !== 429) {
    return Promise.reject(error);
  }

  const config = error.config as AxiosRequestConfig & { _retryCount?: number };

  const headers = error.response?.headers;
  const retryAfter = parseFloat(headers?.['retry-after']);
  const xReset = parseFloat(headers?.['x-ratelimit-reset']);
  const reset = !isNaN(retryAfter) ? retryAfter : (!isNaN(xReset) ? xReset : 30);

  config._retryCount = (config._retryCount || 0) + 1;

  if (config._retryCount <= applicationConfiguration.rateLimitMaxRetries) {
    const backoff = Math.min(reset * 1000, 60000); // convert seconds to ms, cap at 60s

    console.debug(`Rate limited. Retry attempt #${config._retryCount} in ${Math.round(backoff)}ms`);

    return new Promise(resolve => {
      setTimeout(() => {
        resolve(axiosClient(config));
      }, backoff);
    });
  }

  return Promise.reject(error);
});