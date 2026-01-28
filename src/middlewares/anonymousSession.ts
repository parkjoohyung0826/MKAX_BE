import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "mkax_session";

function parseCookies(header?: string) {
  const result: Record<string, string> = {};
  if (!header) return result;
  header.split(";").forEach((pair) => {
    const index = pair.indexOf("=");
    if (index === -1) return;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    result[key] = decodeURIComponent(value);
  });
  return result;
}

function buildCookie(value: string) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function anonymousSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cookies = parseCookies(req.headers.cookie);
  let sessionId = cookies[COOKIE_NAME];

  if (!sessionId) {
    sessionId = randomUUID();
    res.setHeader("Set-Cookie", buildCookie(sessionId));
  }

  req.sessionId = sessionId;
  next();
}
