import { Router } from "express";

import { 
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
 } from "../controllers/video.controllers.js";

import {upload} from '../middleware/multer.middleware.js'    

import { verifyJWT } from "../middleware/auth.middleware.js";

console.info("entered the video.routes")
const router = Router();

// public rotes (no authecation)

router.route('/').get(getAllVideos); 
router.route('/:videoId').get(getVideoById);

// Secured routes (authencation required)
router.route('/publish').post(
    verifyJWT,
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    publishAVideo
);

router.route('/:videoId').patch(verifyJWT,updateVideo);
router.route('/:videoId').delete(verifyJWT,deleteVideo);
router.route('/toggle/publish/:videoId').patch(verifyJWT,togglePublishStatus);

export default router;