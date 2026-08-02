import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return secret;
}

export interface JwtPayload {
  employeeId: string;
  roleId: string;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch (error) {
    console.error("========== JWT ERROR ==========");
    console.error(error);
    console.error("Token verification failed");
    console.error("===============================");
    throw error;
  }
}