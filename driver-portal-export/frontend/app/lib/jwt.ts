/**
 * JWT verification helpers.
 *
 * The Django backend issues short-lived HS256-signed access tokens (see
 * actions/auth.ts `login()`) that carry the user's identity, role, and
 * permission list directly in the payload. Verifying the token locally with
 * the shared signing secret lets Server Components/Actions read "who is
 * this user and what can they do" without an extra network round trip to
 * Django on every page render — the tradeoff is that `JWT_SIGNING_KEY` here
 * must exactly match the key Django signs with.
 */
import { jwtVerify } from "jose";

// Shape of the decoded JWT payload. Field names mirror what Django puts in
// the token, not JS/TS naming conventions (snake_case), so no mapping is
// needed when the token is issued.
export type AccessTokenPayload = {
  sub: string; // subject — the user's id, as a string
  role: string; // machine-readable role key (e.g. "farmer", "admin")
  role_name: string; // human-readable role label for display
  permissions: string[]; // list of permission codenames granted to this user
  full_name: string;
  email: string;
  exp: number; // standard JWT expiry (unix seconds); jwtVerify enforces this
};

// Shared HMAC secret used to sign/verify tokens. Must match the signing key
// configured on the Django side (JWT_SIGNING_KEY env var) or every token
// will fail verification.
const secret = new TextEncoder().encode(process.env.JWT_SIGNING_KEY!);

/**
 * Verifies an access token's signature and expiry, returning its decoded
 * payload if valid.
 *
 * Uses `jose`'s `jwtVerify`, explicitly restricted to the HS256 algorithm
 * (defends against "alg confusion" attacks where a token crafted with a
 * different/weaker algorithm could otherwise be accepted). Any failure —
 * bad signature, expired token, malformed JWT — is caught and normalized to
 * `null` so callers can treat "invalid" and "expired" the same way (i.e.
 * treat the user as unauthenticated) without needing to inspect the error.
 *
 * @param token The raw JWT string, typically read from the `access_token`
 *   cookie.
 * @returns The decoded payload if the token is valid and unexpired,
 *   otherwise `null`.
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}
