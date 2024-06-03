import { Router } from "express"
import auth from "./auth"
import twitter from "./twitter"
import youtube from "./youtube"
import linkedin from "./linkedin"
import instagram from "./instagram"

const router: Router = Router();
router.use("/api/auth", auth);
router.use("/api/twitter", twitter);
router.use("/api/youtube", youtube);
router.use("/api/linkedin", linkedin);
router.use("/api/instagram", instagram);

export default router;
