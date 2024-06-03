import { Router } from "express";
import { requestInstagramAuth, handleInstagramCallback } from "../controllers/instagram";

const router: Router = Router();

router.route("/request-token").get(requestInstagramAuth);
router.route("/callback").get(handleInstagramCallback);
// router.route("/request-token").post(requestToken);

export default router;