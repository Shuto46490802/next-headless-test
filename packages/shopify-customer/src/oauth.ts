import { decodeJwt } from "jose";

export interface CustomerAccountOAuthConfig {
  clientId: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  logoutEndpoint: string;
}

export const CUSTOMER_ACCOUNT_SCOPE = "openid email customer-account-api:full";

export interface AuthorizeUrlParams {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** Set to "none" for silent re-auth (token renewal without a login screen). */
  prompt?: "none";
  loginHint?: string;
}

export function buildAuthorizeUrl(
  config: CustomerAccountOAuthConfig,
  params: AuthorizeUrlParams,
): string {
  const url = new URL(config.authorizeEndpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", CUSTOMER_ACCOUNT_SCOPE);
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.prompt) url.searchParams.set("prompt", params.prompt);
  if (params.loginHint) url.searchParams.set("login_hint", params.loginHint);
  return url.toString();
}

export interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

function toTokenSet(json: TokenResponse): TokenSet {
  return {
    accessToken: json.access_token,
    idToken: json.id_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function exchangeCodeForToken(
  config: CustomerAccountOAuthConfig,
  params: { code: string; codeVerifier: string; redirectUri: string },
): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(`Token exchange failed: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim());
  }
  return toTokenSet(json);
}

/** Only works for clients configured on the shop (headless/Hydrogen); app-client-id public clients don't get a refresh_token. */
export async function refreshAccessToken(
  config: CustomerAccountOAuthConfig,
  refreshToken: string,
): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  });

  const res = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(`Token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim());
  }
  return toTokenSet(json);
}

export function buildLogoutUrl(
  config: CustomerAccountOAuthConfig,
  params: { idToken: string; postLogoutRedirectUri: string },
): string {
  const url = new URL(config.logoutEndpoint);
  url.searchParams.set("id_token_hint", params.idToken);
  url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  return url.toString();
}

export interface IdTokenClaims {
  sub: string;
  email?: string;
  nonce?: string;
  exp: number;
  [key: string]: unknown;
}

/**
 * Decodes (does not cryptographically verify) the id_token. Safe here because the token
 * was obtained via a direct server-to-server HTTPS call to Shopify's token endpoint, not
 * supplied by the browser. A production hardening pass could verify against Shopify's JWKS.
 */
export function decodeIdToken(idToken: string): IdTokenClaims {
  return decodeJwt(idToken) as IdTokenClaims;
}
