import express from "express";
const router = express.Router();

import Product from "../controllers/product/index.js";
// import cache from '../cache';

import uploadMiddleware from "../middleware/image.js";
import grantAccess from "../middleware/grantAccess.js";

router.post(
    "/",
    grantAccess("createAny", "allProject"),
    uploadMiddleware.array("files"),
    Product.Create
);

router.get("/search/:keyword", Product.Search);

router.get("/:product_id", Product.Get);

router.get("/", Product.GetList);

router.put(
    "/:product_id",
    grantAccess("createAny", "allProject"),
    uploadMiddleware.array("files"),
    Product.Update
);

router.delete(
    "/:product_id",
    grantAccess("createAny", "allProject"),
    Product.Delete
);

export default router;
