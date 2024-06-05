import { Router } from "express";
import { requestLinkedInAuth, handleLinkedInCallback, postLinkedInComment } from "../controllers/linkedin";

const router: Router = Router();

router.route("/request-token").get(requestLinkedInAuth);
router.route("/callback").get(handleLinkedInCallback);
router.route("/comment").post(postLinkedInComment);
// router.route("/request-token").post(requestToken);

export default router;