import express from "express";
const router = express.Router();

import Category from "../controllers/category/index.js";
// import cache from '../cache';

import grantAccess from "../middleware/grantAccess.js";
import { verifyAccessToken } from "../helpers/jwt.js";

router.post(
	"/",
	//verifyAccessToken,
	//grantAccess("createAny", "product"),
	Category.Create
);

router.get(
	"/:category_id",
	//verifyAccessToken,
	//grantAccess('readAny', 'product'),
	// cache.route(),
	Category.Get
);

router.get("/", Category.GetList);
router.put("/:category_id", Category.Update);
router.delete("/:category_id", Category.Delete);

export default router;
