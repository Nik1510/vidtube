import { Router } from "express";
import {registerUser,logoutUser} from '../controllers/user.controllers.js'

import {upload} from '../middleware/multer.middleware.js'

import { verifyJWT } from "../middleware/auth.middleware.js";

console.info("enterd the user.routes")
const router = Router();

// here we have to post the request
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },{
            name:"coverImage",
            maxCount:1
        }
    ])
    ,registerUser)

// secured routes

router.route("/logout").post(verifyJWT,logoutUser)

export default router;