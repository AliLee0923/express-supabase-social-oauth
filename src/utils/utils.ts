import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

export const getUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    return decoded.sub;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};
