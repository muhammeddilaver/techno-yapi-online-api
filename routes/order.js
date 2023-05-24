import express from "express";
const router = express.Router();

import Order from "../controllers/order/index.js";
// import cache from '../cache';

import grantAccess from "../middleware/grantAccess.js";
import { verifyAccessToken } from "../helpers/jwt.js";

router.post(
    "/",
    //verifyAccessToken,
    //grantAccess("createAny", "product"),
    Order.Create
);

router.get(
    "/:order_id",
    //verifyAccessToken,
    //grantAccess('readAny', 'product'),
    // cache.route(),
    Order.Get
);

router.get("/", Order.GetList);
router.put("/:order_id", Order.Update);
router.delete("/:order_id", Order.Delete);

export default router;
