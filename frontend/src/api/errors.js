export class ApiError extends Error {
  constructor(message, { status = 500, code = 'REQUEST_FAILED' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function parseErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  return `Request failed (${status})`;
}

export function parseErrorCode(data) {
  if (data?.code) return data.code;
  if (typeof data?.error === 'object' && data.error.code) return data.error.code;
  return null;
}
