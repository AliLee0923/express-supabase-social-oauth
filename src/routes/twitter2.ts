import { Router } from "express";
import { initiateTwitterOAuth, handleTwitterCallback, postTweet } from "../controllers/twitter2";

const router: Router = Router();

router.route("/request-token").get(initiateTwitterOAuth);
router.route("/callback").get(handleTwitterCallback);
router.route("/comment").post(postTweet);
// router.route("/request-token").post(requestToken);

export default router;