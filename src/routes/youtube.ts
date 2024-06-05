import { Router } from "express";
import { requestAuth, handleCallback, postComment } from "../controllers/youtube";

const router: Router = Router();

router.route("/request-token").get(requestAuth);
router.route("/callback").get(handleCallback);
router.route("/comment").post(postComment);
// router.route("/request-token").post(requestToken);

export default router;