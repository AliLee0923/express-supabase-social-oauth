import { Router } from "express";
import { requestToken, handleCallback, postComment } from "../controllers/twitter";

const router: Router = Router();

router.route("/request-token").get(requestToken);
router.route("/callback").get(handleCallback);
router.route("/comment").post(postComment);
// router.route("/request-token").post(requestToken);

export default router;