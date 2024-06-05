import { Router } from "express";
import { requestInstagramAuth, handleInstagramCallback, postInstagramComment } from "../controllers/instagram";

const router: Router = Router();

router.route("/request-token").get(requestInstagramAuth);
router.route("/callback").get(handleInstagramCallback);
router.route("/comment").post(postInstagramComment);

export default router;