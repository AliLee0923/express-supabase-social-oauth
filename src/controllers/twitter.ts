import { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const API_KEY = process.env.TWITTER_API_KEY || "";
const API_SECRET_KEY = process.env.TWITTER_API_SECRET_KEY || "";
const CALLBACK_URL = "https://express-supabase-social-oauth.vercel.app/api/twitter/callback";

const oauth = new OAuth({
  consumer: {
    key: API_KEY,
    secret: API_SECRET_KEY,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string: string, key: string) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  },
});

export const requestToken = async (req: Request, res: Response) => {
  const url = "https://api.twitter.com/oauth/request_token";
  const token = req.query.access_token as string;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const request_data = {
    url: url,
    method: "POST",
    data: {
      oauth_callback: CALLBACK_URL + "?token=" + token,
    },
  };

  try {
    const headers = oauth.toHeader(oauth.authorize(request_data));

    const response = await axios.post(
      url,
      querystring.stringify({
        oauth_callback: CALLBACK_URL + "?token=" + token,
      }),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const responseParams = querystring.parse(response.data);

    res.json({
      oauth_token: responseParams.oauth_token,
      oauth_token_secret: responseParams.oauth_token_secret,
    });
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  const oauth_token = req.query.oauth_token as string;
  const oauth_verifier = req.query.oauth_verifier as string;
  const token = req.query.token as string;

  if (!oauth_token || !oauth_verifier) {
    return res.status(400).send("Missing oauth_token or oauth_verifier");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const url = "https://api.twitter.com/oauth/access_token";
  const request_data = {
    url: url,
    method: "POST",
    data: { oauth_token, oauth_verifier },
  };

  try {
    const headers = oauth.toHeader(oauth.authorize(request_data));
    const response = await axios.post(
      url,
      querystring.stringify({ oauth_token, oauth_verifier }),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const responseParams = querystring.parse(response.data);

    // You should save these tokens in your database
    const accessToken = responseParams.oauth_token;
    const accessTokenSecret = responseParams.oauth_token_secret;

    const { data, error } = await supabase.from("twitter_tokens").upsert({
      user_id: userId,
      access_token: accessToken,
      access_token_secret: accessTokenSecret,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Redirect to your frontend with the tokens (or store them in session, etc.)
    res.redirect(`https://vite-vue-topaz-one.vercel.app/profile`);
  } catch (error: any) {
    res.status(500).send(error.toString());
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

  const { data, error } = await supabase
    .from("twitter_tokens")
    .select("access_token, access_token_secret")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching Twitter tokens:", error);
    return res.status(500).send("Failed to fetch Twitter tokens");
  }

  const accessToken = data.access_token;
  const accessTokenSecret = data.access_token_secret;

  if (!postId || !comment || !accessToken || !accessTokenSecret) {
    return res.status(400).send("Missing required parameters");
  }

  const url = "https://api.twitter.com/1.1/statuses/update.json";
  const request_data = {
    url,
    method: "POST",
    data: {
      status: comment,
      in_reply_to_status_id: postId,
    },
  };

  try {
    const token = {
      key: accessToken,
      secret: accessTokenSecret,
    };

    const headers = oauth.toHeader(oauth.authorize(request_data, token));

    const response = await axios.post(
      url,
      querystring.stringify({
        status: comment,
        in_reply_to_status_id: postId,
      }),
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
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
