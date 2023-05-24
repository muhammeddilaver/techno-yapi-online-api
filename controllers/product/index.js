import Product from "../../models/product.js";
import Boom from "boom";
import ProductSchema from "./validations.js";
import mongoose from "mongoose";

const limit = 12;

const Create = async (req, res, next) => {
    const input = req.body;
    const { error } = ProductSchema.validate(input);

    if (error) {
        return next(Boom.badRequest(error.details[0].message));
    }

    try {
        input.kategori_id = new mongoose.Types.ObjectId(input.kategori_id);
        let photos = [];
        req.files.forEach(photo => {
            photos.push(photo.path);
        });
        input.photos = photos;
        const product = new Product(input);
        const savedData = await product.save();

        res.json(savedData);
    } catch (e) {
        next(e);
    }
};

const Get = async (req, res, next) => {
    const { product_id } = req.params;

    if (!product_id) {
        return next(Boom.badRequest("Missing paramter (:product_id)"));
    }

    try {
        const product = await Product.findById(product_id);

        if (!product) {
            return next(Boom.badRequest("Ürün bulunamadı."));
        }

        product.fiyat = product.fiyat + ((product.fiyat * product.carpan) / 100);

        res.json(product);
    } catch (e) {
        next(e);
    }
};

const Search = async (req, res, next) => {
    let { page } = req.query;

    if (page < 1) {
        page = 1;
    }

    const skip = (parseInt(page) - 1) * limit;

    const { ara } = req.params;

    if (!ara) {
        return next(Boom.badRequest("Missing paramter (:ara)"));
    }

    try {
        const products = await Product.find({
            ad: { $regex: ".*" + ara + ".*" },
        })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        if (products.length == 0) {
            return next(Boom.notFound("Ürün bulunamadı."));
        }

        for (let i = 0; i < products.length; i++) {
            products[i].fiyat = products[i].fiyat + ((products[i].fiyat * products[i].carpan) / 100);
        }

        res.json(products);
    } catch (e) {
        next(e);
    }
};

const Update = async (req, res, next) => {
    const { product_id } = req.params;
    const input = req.body;

    try {
        if(req.files.length > 0){
            let photos = [];
            req.files.forEach(photo => {
                photos.push(photo.path);
            });
            input.photos = photos;
        }

        const updated = await Product.findByIdAndUpdate(product_id, input, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const Delete = async (req, res, next) => {
    const { product_id } = req.params;

    try {
        const deleted = await Product.findByIdAndDelete(product_id);

        if (!deleted) {
            throw Boom.badRequest("Product not found.");
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
        const products = await Product.find({})
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        for (let i = 0; i < products.length; i++) {
            products[i].fiyat = products[i].fiyat + ((products[i].fiyat * products[i].carpan) / 100);
        }

        res.json(products);
    } catch (e) {
        next(e);
    }
};

export default {
    Create,
    Get,
    Search,
    Update,
    Delete,
    GetList,
};
