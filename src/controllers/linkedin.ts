import { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const LINKEDIN_REDIRECT_URI = "http://127.0.0.1:5000/api/linkedin/callback";
const LINKEDIN_SCOPES = ["profile", "email"].join(" ");

export const requestLinkedInAuth = (req: Request, res: Response) => {
  const token = req.query.access_token as string;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  const userId = getUserIdFromToken(token);

  if (!userId) {
    return res.status(401).send("Invalid token");
  }

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${querystring.stringify(
    {
      response_type: "code",
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      scope: LINKEDIN_SCOPES,
      state: encodeURIComponent(token),
    }
  )}`;

  res.redirect(authUrl);
};

export const handleLinkedInCallback = async (req: Request, res: Response) => {
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
      "https://www.linkedin.com/oauth/v2/accessToken",
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    const { data, error } = await supabase.from("linkedin_tokens").upsert({
      user_id: userId,
      access_token: access_token,
      refresh_token: refresh_token,
    });

    if (error) {
      throw new Error(error.message);
    }

    // You should save these tokens in your database
    // For now, we'll just redirect to the frontend with the tokens as query params
    res.redirect(
      `http://localhost:5173/profile`
    );
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
};
