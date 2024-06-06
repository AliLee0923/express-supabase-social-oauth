import { Request, Response } from "express";
import crypto from "crypto";
import querystring from "querystring";
import axios from "axios";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const TWITTER_CLIENT_ID = process.env.TWITTER_API_KEY || "";
const TWITTER_CLIENT_SECRET = process.env.TWITTER_API_SECRET_KEY || "";
const TWITTER_REDIRECT_URI =
  process.env.TWITTER_REDIRECT_URI ||
  "https://express-supabase-social-oauth.vercel.app/api/twitter2/callback";

const sessionStore: { [key: string]: { codeVerifier: string; state: string } } =
  {};

export const initiateTwitterOAuth = (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const authUrl = `https://twitter.com/i/oauth2/authorize?${querystring.stringify(
    {
      response_type: "code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_REDIRECT_URI,
      scope: "tweet.read tweet.write users.read offline.access",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }
  )}`;

  sessionStore[state] = { codeVerifier, state };
  //   res.redirect(authUrl)
  res.json({ authUrl });
};

export const handleTwitterCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };

  if (!state || !code) {
    return res.status(400).send("Missing state or code");
  }

  const session = sessionStore[state as string];

  if (!session || session.state !== state) {
    return res.status(400).send("Invalid state");
  }

  const { codeVerifier } = session;

  try {
    const response = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      querystring.stringify({
        grant_type: "authorization_code",
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: TWITTER_REDIRECT_URI,
        code: code,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const token = req.query.token as string;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).send("Invalid token");
    }

    const { error } = await supabase.from("twitter_tokens").upsert({
      user_id: userId,
      access_token,
      refresh_token,
      expires_in,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.redirect(`https://vite-vue-topaz-one.vercel.app/profile`);
  } catch (error: any) {
    res.status(500).send(error.toString());
  } finally {
    delete sessionStore[state as string];
  }
};

export const postTweet = async (req: Request, res: Response) => {
  const { comment, in_reply_to_tweet_id } = req.body;
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
    .from("twitter_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    console.error("Error fetching Twitter tokens:", error);
    return res.status(500).send("Failed to fetch Twitter tokens");
  }

  const accessToken = data.access_token;

  if (!comment) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    const response = await axios.post(
      "https://api.twitter.com/2/tweets",
      {
        text: comment,
        ...(in_reply_to_tweet_id && { in_reply_to_tweet_id }),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error(
      "Error posting tweet:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send(error.toString());
  }
};
