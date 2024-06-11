import { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const REDIRECT_URI =
  "https://express-supabase-social-oauth.vercel.app/api/youtube/callback";
const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"].join(" ");

export const requestAuth = (req: Request, res: Response) => {
  const token = req.query.access_token as string;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(
    {
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: encodeURIComponent(token),
    }
  )}`;

  res.redirect(authUrl);
};

export const handleCallback = async (req: Request, res: Response) => {
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
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      })
    );

    const { access_token, refresh_token } = response.data;

    const { data, error } = await supabase.from("youtube_tokens").upsert({
      user_id: userId,
      access_token: access_token,
      refresh_token: refresh_token,
    });

    if (error) {
      throw new Error(error.message);
    }

    // You should save these tokens in your database
    // For now, we'll just redirect to the frontend with the tokens as query params
    res.redirect(`https://vite-vue-topaz-one.vercel.app/profile`);
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
};

export const refreshAccessToken = async (userId: string) => {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from("youtube_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .single();

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    const refreshToken = tokenData.refresh_token;

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
    );

    const { access_token } = response.data;

    await supabase
      .from("youtube_tokens")
      .update({ access_token })
      .eq("user_id", userId);

    return access_token;
  } catch (error: any) {
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
};

export const postComment = async (req: Request, res: Response) => {
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

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from("youtube_tokens")
      .select("access_token")
      .eq("user_id", userId)
      .single();

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    const accessToken = tokenData.access_token;

    const response = await axios.post(
      "https://www.googleapis.com/youtube/v3/commentThreads",
      // {
      //   snippet: {
      //     videoId: postId,
      //     topLevelComment: {
      //       snippet: {
      //         textOriginal: comment,
      //       },
      //     },
      //   },
      // },
      {
        id: postId,
        snippet: {
          textOriginal: comment
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).send(response.data);
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
};
