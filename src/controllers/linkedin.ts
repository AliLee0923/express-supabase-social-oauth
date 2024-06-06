import { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import { supabase } from "../utils/supabase";
import { getUserIdFromToken } from "../utils/utils";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const LINKEDIN_REDIRECT_URI =
  "https://express-supabase-social-oauth.vercel.app/api/linkedin/callback";
const LINKEDIN_SCOPES = ["liteprofile", "emailaddress", "w_member_social"].join(" ");

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

    const { access_token } = response.data;

    // Fetch LinkedIn user ID
    const profileResponse = await axios.get("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const linkedinUserId = profileResponse.data.id;

    const { data, error } = await supabase.from("linkedin_tokens").upsert({
      user_id: userId,
      access_token: access_token,
      linkedin_user_id: linkedinUserId,
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

export const postLinkedInComment = async (req: Request, res: Response) => {
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
    .from("linkedin_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching LinkedIn tokens:", error);
    return res.status(500).send("Failed to fetch LinkedIn tokens");
  }

  const accessToken = data.access_token;

  if (!postId || !comment || !accessToken) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    const response = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${postId}/comments`,
      {
        actor: `urn:li:person:${userId}`,
        message: {
          text: comment,
        },
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
      "Error posting comment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send(error.toString());
  }
};
