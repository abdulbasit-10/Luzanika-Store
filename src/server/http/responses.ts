import { NextResponse } from "next/server";

import type { ApiErrorCode } from "./api-error";

export interface ErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}

/** 200 with a JSON body. */
export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** 201 with the new resource and its address in the Location header. */
export function created<T>(data: T, location: string): NextResponse {
  return NextResponse.json(data, {
    status: 201,
    headers: { Location: location },
  });
}

/** 204: success, nothing to return. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorBody(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  fields?: Record<string, string>,
): ErrorBody {
  return {
    error: { code, message, ...(fields ? { fields } : {}), requestId },
  };
}
