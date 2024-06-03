import { Router } from "express";
import { requestLinkedInAuth, handleLinkedInCallback } from "../controllers/linkedin";

const router: Router = Router();

router.route("/request-token").get(requestLinkedInAuth);
router.route("/callback").get(handleLinkedInCallback);
// router.route("/request-token").post(requestToken);

export default router;