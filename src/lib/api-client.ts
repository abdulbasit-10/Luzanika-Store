import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";

export class ApiError extends Error {
  readonly status: number | null;
  readonly data: unknown;

  constructor(message: string, status: number | null, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "message" in data) {
    const { message } = data as { message: unknown };
    if (typeof message === "string" && message.length > 0) return message;
  }
  return null;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    if (error.response) {
      const { status, data } = error.response;
      return new ApiError(
        extractMessage(data) ?? `Request failed with status ${status}`,
        status,
        data,
      );
    }
    if (error.code === AxiosError.ECONNABORTED) {
      return new ApiError("The request timed out. Please try again.", null);
    }
    return new ApiError(
      "Unable to reach the server. Please check your connection.",
      null,
    );
  }

  return new ApiError(
    error instanceof Error ? error.message : "Unexpected error",
    null,
  );
}

/**
 * Shared Axios instance. Authentication can be added later through
 * `apiClient.interceptors.request`.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<T>(url, body, config);
  return response.data;
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.patch<T>(url, body, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}
