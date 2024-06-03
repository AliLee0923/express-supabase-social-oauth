import { Router } from "express";
import { signup, signin, signout, getUser } from "../controllers/auth";

const router: Router = Router();

// router.post("/signup", signup)
// router.post("/signin", signin)
router.route("/signin").post(signin);
router.route("/signup").post(signup);
router.route("/signout").post(signout);
router.route("/getuser").get(getUser);

export default router;