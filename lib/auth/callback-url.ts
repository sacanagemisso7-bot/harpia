const DEFAULT_AUTH_REDIRECT = "/dashboard";

function sanitizeRelativePath(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (pathname === "/" || pathname.startsWith("/login")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return pathname;
}

export function normalizeCallbackPath(input?: string | null) {
  if (!input) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    if (input.startsWith("/")) {
      return sanitizeRelativePath(input);
    }

    const parsed = new URL(input);
    return sanitizeRelativePath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

export function normalizeCallbackUrl(input: string, baseUrl: string) {
  const normalizedPath = normalizeCallbackPath(input);
  return new URL(normalizedPath, baseUrl).toString();
}

export { DEFAULT_AUTH_REDIRECT };
