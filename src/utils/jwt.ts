import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  employeeId: string;
  roleId: string;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error("========== JWT ERROR ==========");
    console.error(error);
    console.log("JWT_SECRET =", JWT_SECRET);
    console.log("TOKEN =", token);
    console.error("===============================");
    throw error;
  }
}