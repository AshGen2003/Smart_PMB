import { jwtVerify } from "jose";

export type AccessTokenPayload = {
  sub: string;
  role: string;
  role_name: string;
  permissions: string[];
  full_name: string;
  email: string;
  exp: number;
};

const secret = new TextEncoder().encode(process.env.JWT_SIGNING_KEY!);

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
