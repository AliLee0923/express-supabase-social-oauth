import { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID || "";
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || "";
const REDIRECT_URI =
  "https://express-supabase-social-oauth.vercel.app/api/instagram/callback";
const SCOPES = ["user_profile", "user_media", "comments"].join(" ");

export const requestInstagramAuth = (req: Request, res: Response) => {
  const token = req.query.access_token as string;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const authUrl = `https://api.instagram.com/oauth/authorize?${querystring.stringify(
    {
      client_id: INSTAGRAM_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      state: encodeURIComponent(token),
    }
  )}`;

  res.redirect(authUrl);
};

export const handleInstagramCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const token = decodeURIComponent(state);

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      querystring.stringify({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, user_id } = response.data;

    const { data, error } = await supabase.from("instagram_tokens").upsert({
      user_id: userId,
      access_token: access_token,
      instagram_user_id: user_id,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.redirect(`https://vite-vue-topaz-one.vercel.app/profile`);
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
};

export const postInstagramComment = async (req: Request, res: Response) => {
  const { postId, comment } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const { data, error } = await supabase
    .from("instagram_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching Instagram tokens:", error);
    return res.status(500).send("Failed to fetch Instagram tokens");
  }

  const accessToken = data.access_token;

  if (!postId || !comment || !accessToken) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v12.0/${postId}/comments`,
      {
        message: comment,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error(
      "Error posting comment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send(error.toString());
  }
};
