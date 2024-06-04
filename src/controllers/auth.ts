import { Request, Response } from "express";
import { supabase } from "../utils/supabase";
import { AuthError, User } from "@supabase/supabase-js";

interface MagicLinkResponse {
  data: {
    user: User | null;
  };
  error: AuthError | null;
}

export const signup = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const { data, error }: MagicLinkResponse =
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: "https://vite-vue-topaz-one.vercel.app/login",
        },
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: "Magic link sent to your email." });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const { data, error }: MagicLinkResponse =
      await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: "https://vite-vue-topaz-one.vercel.app/profile",
        },
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data) {
      return res
        .status(200)
        .json({ message: "Magic link sent to your email." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { access_token } = req.query;

  if (!access_token) {
    res.status(400).json({ error: "Access token is required" });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(access_token as string);

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (!data || !data.user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ user: data.user });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const signout = async (req: Request, res: Response) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: "Signed out successfully" });
};
