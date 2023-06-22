import express from "express";
const router = express.Router();

import Order from "../controllers/order/index.js";
// import cache from '../cache';

import grantAccess from "../middleware/grantAccess.js";
//grantAccess("createAny", "allProject")


router.get("/admin/", grantAccess("createAny", "allProject"), Order.GetListAdmin);
router.get("/admin/:order_id", grantAccess("createAny", "allProject"), Order.GetAdmin);
router.get(
    "/:order_id",
    // cache.route(),
    Order.Get
);
router.get("/", Order.GetList);

router.post("/", Order.Create);
router.put("/:order_id/offer", Order.AcceptOrRejectOffer);
router.put("/:order_id/return", grantAccess("createAny", "allProject"), Order.Return);
router.put("/:order_id/delete", Order.DeleteProduct);
router.put("/:order_id", grantAccess("createAny", "allProject"), Order.UpdateOrderAdmin);
router.put("/:order_id/addone", grantAccess("createAny", "allProject"), Order.AddProductToOrder);

//admin


//router.put("/:order_id", Order.Update);
//router.delete("/:order_id", Order.Delete);

export default router;
