import Product from "../../models/product.js";
import Category from "../../models/category.js";
import Boom from "boom";
import {CategorySchema} from "./validations.js";
import mongoose from "mongoose";

const limit = 12;

const Create = async (req, res, next) => {
    const input = req.body;
    const { error } = CategorySchema.validate(input);

    if (error) {
        return next(Boom.badRequest(error.details[0].message));
    }

    try {
        const category = new Category(input);
        const savedData = await category.save();

        res.json(savedData);
    } catch (e) {
        next(e);
    }
};

const Get = async (req, res, next) => {
    let { page } = req.query;

    if (!page) {
        page = 1;
    }

    const skip = (parseInt(page) - 1) * limit;

    const { category_id } = req.params;

    if (!category_id) {
        return next(Boom.badRequest("Missing paramter (:category_id)"));
    }

    try {
        const category = await Category.aggregate([
            {
                $match: {
                    '_id': new mongoose.Types.ObjectId(req.params.category_id)
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'kategori_id',
                    pipeline: [
                        { $skip: skip},
                        { $limit: limit }
                     ],
                    as: 'urunler'
                }
            },
            {
                $unwind: {
                    path: '$urunler',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        _id: '$_id',
                        ad: '$ad'
                    },
                    urunler: {
                        $push: '$urunler'
                    }
                }
            },
            {
                $project: {
                    _id: '$_id._id',
                    ad: '$_id.ad',
                    urunler: '$urunler'
                }
            }
        ]);

        if (category.length == 0) {
            return next(Boom.notFound("Kategori bulunamadı."));
        }

        if (category[0].urunler.length == 0) {
            return next(Boom.notFound("Ürün bulunamadı."));
        }

        for (let i = 0; i < category[0].urunler.length; i++) {
            category[0].urunler[i].fiyat = category[0].urunler[i].fiyat + ((category[0].urunler[i].fiyat * category[0].urunler[i].carpan) / 100);
        }

        res.json(category);
    } catch (e) {
        next(e);
    }
};

const Update = async (req, res, next) => {
    const { category_id } = req.params;

    try {
        const updated = await Category.findByIdAndUpdate(category_id, req.body, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const Delete = async (req, res, next) => {
    const { category_id } = req.params;

    try {
        const deleted = await Category.findByIdAndDelete(category_id);

        if (!deleted) {
            throw Boom.badRequest("Category not found.");
        }

        res.json(deleted);
    } catch (e) {
        next(e);
    }
};

const GetList = async (req, res, next) => {
    let { page } = req.query;

    if (page < 1) {
        page = 1;
    }

    const skip = (parseInt(page) - 1) * limit;

    try {
        const category = await Category.find({})
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        res.json(category);
    } catch (e) {
        next(e);
    }
};

export default {
    Create,
    Get,
    Update,
    Delete,
    GetList,
};
