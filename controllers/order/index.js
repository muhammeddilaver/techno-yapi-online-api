import Product from "../../models/product.js";
import Order from "../../models/order.js";
import Boom from "boom";
import { OrderSchema } from "./validations.js";
import mongoose from "mongoose";

const limit = 12;

const Create = async (req, res, next) => {
    const input = req.body;
    const { error } = OrderSchema.validate(input);

    if (error) {
        return next(Boom.badRequest(error.details[0].message));
    }

    try {
        input.user_id = req.payload.user_id;
        input.total_price = 0;
        input.products = new mongoose.Types.Array(JSON.parse(input.products));

        for (let i = 0; i < input.products.length; i++) {
            let product_info = await Product.findById(
                new mongoose.Types.ObjectId(input.products[i]._id)
            );
            input.products[i].price =
                product_info.price +
                (product_info.price * product_info.factor) / 100;
            input.total_price +=
                input.products[i].price * input.products[i].piece;
        }

        const order = new Order(input);
        const savedData = await order.save();

        res.json(savedData);
    } catch (e) {
        next(e);
    }
};

const Get = async (req, res, next) => {
    const { order_id } = req.params;

    if (!order_id) {
        return next(Boom.badRequest("Missing paramter (:order_id)"));
    }

    try {
        const order = await Order.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(order_id),
                },
            },
            {
                $lookup: {
                    from: "auths",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "client",
                },
            },
            {
                $unwind: {
                    path: "$client",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);

        if (order[0].user_id != req.payload.user_id) {
            return next(Boom.badRequest("This order is not yours."));
        }

        for (let index = 0; index < order[0].products.length; index++) {
            let product_info = await Product.findById(
                order[0].products[index].urun_id
            );
            order[0].products[index].name = product_info.name;
            order[0].products[index].photos = product_info.photos;
            order[0].products[index].category_id = product_info.category_id;
            order[0].products[index].brand = product_info.brand;
        }

        for (let index = 0; index < order[0].returns.length; index++) {
            let product_info = await Product.findById(
                order[0].returns[index].product_id
            );
            order[0].returns[index].name = product_info.name;
            order[0].returns[index].photos = product_info.photos;
            order[0].returns[index].category_id = product_info.category_id;
            order[0].returns[index].brand = product_info.brand;
        }

        res.json(order);
    } catch (e) {
        next(e);
    }
};

const Update = async (req, res, next) => {
    const { order_id } = req.params;
    const input = req.body;
    const old = await Order.findById(new mongoose.Types.ObjectId(order_id));

    if (old.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    }

    try {
        if (input.products) {
            input.total_price = 0;
            input.products = new mongoose.Types.Array(
                JSON.parse(input.products)
            );
            for (let i = 0; i < input.products.length; i++) {
                let product_info = await Product.findById(
                    new mongoose.Types.ObjectId(input.products[i].product_id)
                );
                input.products[i].price =
                    product_info.price +
                    (product_info.price * product_info.factor) / 100;

                old.products.forEach(async (product) => {
                    if (product.product_id == input.products[i].product_id) {
                        input.products[i].price = product.price;
                    }
                });

                input.total_price +=
                    input.products[i].price * input.products[i].piece;
            }

            input.returns = new mongoose.Types.Array(JSON.parse(input.returns));
            input.returns.forEach((returned_product) => {
                old.products.every((product) => {
                    if (returned_product.product_id == product.product_id) {
                        returned_product.price = product.price;
                        return false;
                    }
                    return true;
                });
            });
        }

        const updated = await Order.findByIdAndUpdate(order_id, input, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const Delete = async (req, res, next) => {
    const { order_id } = req.params;

    const old = await Order.findById(new mongoose.Types.ObjectId(order_id));

    if (old.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    }

    try {
        const deleted = await Order.findByIdAndDelete(order_id);

        if (!deleted) {
            throw Boom.badRequest("Order not found.");
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
        const order = await Order.find({
            user_id: req.payload.user_id,
        })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        for (let i = 0; i < order.length; i++) {
            for (let index = 0; index < order[i].products.length; index++) {
                let product_info = await Product.findById(
                    order[i].products[index]._id
                );
                order[i].products[index].name = product_info.name;
                order[i].products[index].photos = product_info.photos;
                order[i].products[index].category_id = product_info.category_id;
                order[i].products[index].brand = product_info.brand;
            }

            for (let index = 0; index < order[i].returns.length; index++) {
                let product_info = await Product.findById(
                    order[i].returns[index]._id
                );
                order[i].returns[index].name = product_info.name;
                order[i].returns[index].photos = product_info.photos;
                order[i].returns[index].category_id = product_info.category_id;
                order[i].returns[index].brand = product_info.brand;
            }
        }

        res.json(order);
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
