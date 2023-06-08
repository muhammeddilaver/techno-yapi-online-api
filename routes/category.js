import express from "express";
const router = express.Router();

import Category from "../controllers/category/index.js";
// import cache from '../cache';

router.post("/", Category.Create);

router.get("/:category_id", Category.Get);

router.get("/", Category.GetList);

export default router;
