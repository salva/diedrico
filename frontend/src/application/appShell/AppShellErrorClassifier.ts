export function describeUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isMissingRemoteFileError(error: unknown): boolean {
  const message = describeUnknownError(error);
  return message.includes('File not found') || message.includes('deleted');
}

export function isAuthenticationError(error: unknown): boolean {
  const message = describeUnknownError(error);
  return message.includes('authentication') || message.includes('401');
}

export function isQuotaError(error: unknown): boolean {
  const message = describeUnknownError(error);
  return message.includes('quota') || message.includes('403');
}
