import express from "express";
const router = express.Router();

import Product from "../controllers/product/index.js";
// import cache from '../cache';

import uploadMiddleware from "../middleware/image.js";
import grantAccess from "../middleware/grantAccess.js";
import { verifyAccessToken } from "../helpers/jwt.js";

router.post(
	"/",
	//verifyAccessToken,
	//grantAccess("createAny", "product"),
	uploadMiddleware.array("files"),
	Product.Create
);

router.get(
	"/ara/:ara",
	//verifyAccessToken,
	//grantAccess('readAny', 'product'),
	// cache.route(),
	Product.Search
);

router.get(
	"/:product_id",
	//verifyAccessToken,
	//grantAccess('readAny', 'product'),
	// cache.route(),
	Product.Get
);
// router.get('/', cache.route(), Product.GetList);
router.get("/", Product.GetList);
router.put("/:product_id", uploadMiddleware.array("files"), Product.Update);
router.delete("/:product_id", Product.Delete);

export default router;
