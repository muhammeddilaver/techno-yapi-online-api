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
        input.musteri_id = req.payload.user_id;
        input.tutar = 0;
        input.urunler = new mongoose.Types.Array(JSON.parse(input.urunler));

        for (let i = 0; i < input.urunler.length; i++) {
            let urunbilgi = await Product.findById(
                new mongoose.Types.ObjectId(input.urunler[i].urun_id)
            );
            input.urunler[i].fiyat =
                urunbilgi.fiyat + (urunbilgi.fiyat * urunbilgi.carpan) / 100;
            input.tutar += input.urunler[i].fiyat * input.urunler[i].adet;
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
                    localField: "musteri_id",
                    foreignField: "_id",
                    as: "musteri",
                },
            },
            {
                $unwind: {
                    path: "$musteri",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);

        if (order[0].musteri_id != req.payload.user_id) {
            return next(Boom.badRequest("Bu sipariş size ait değildir."));
        }

        for (let index = 0; index < order[0].urunler.length; index++) {
            let urunbilgi = await Product.findById(
                order[0].urunler[index].urun_id
            );
            order[0].urunler[index].ad = urunbilgi.ad;
            order[0].urunler[index].photo = urunbilgi.photo;
            order[0].urunler[index].kategori = urunbilgi.kategori;
            order[0].urunler[index].marka = urunbilgi.marka;
        }

        for (let index = 0; index < order[0].iadeler.length; index++) {
            let urunbilgi = await Product.findById(
                order[0].iadeler[index].urun_id
            );
            order[0].iadeler[index].ad = urunbilgi.ad;
            order[0].iadeler[index].photo = urunbilgi.photo;
            order[0].iadeler[index].kategori = urunbilgi.kategori;
            order[0].iadeler[index].marka = urunbilgi.marka;
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

    if (old.musteri_id != req.payload.user_id) {
        return next(Boom.badRequest("Bu sipariş size ait değildir."));
    }

    try {
        if (input.urunler) {
            input.tutar = 0;
            input.urunler = new mongoose.Types.Array(JSON.parse(input.urunler));
            for (let i = 0; i < input.urunler.length; i++) {
                let urunbilgi = await Product.findById(
                    new mongoose.Types.ObjectId(input.urunler[i].urun_id)
                );
                input.urunler[i].fiyat =
                    urunbilgi.fiyat +
                    (urunbilgi.fiyat * urunbilgi.carpan) / 100;

                old.urunler.forEach(async (urun) => {
                    if (urun.urun_id == input.urunler[i].urun_id) {
                        input.urunler[i].fiyat = urun.fiyat;
                    }
                });

                input.tutar += input.urunler[i].fiyat * input.urunler[i].adet;
            }

            input.iadeler = new mongoose.Types.Array(JSON.parse(input.iadeler));
            input.iadeler.forEach((iade) => {
                old.urunler.every((urun) => {
                    if (iade.urun_id == urun.urun_id) {
                        iade.fiyat = urun.fiyat;
                        return false;
                    }
                    console.log(true);
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

    if (old.musteri_id != req.payload.user_id) {
        return next(Boom.badRequest("Bu sipariş size ait değildir."));
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
            musteri_id: req.payload.user_id,
        })
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        for (let i = 0; i < order.length; i++) {
            for (let index = 0; index < order[i].urunler.length; index++) {
                let urunbilgi = await Product.findById(
                    order[i].urunler[index].urun_id
                );
                order[i].urunler[index].ad = urunbilgi.ad;
                order[i].urunler[index].photo = urunbilgi.photo;
                order[i].urunler[index].kategori_id = urunbilgi.kategori_id;
                order[i].urunler[index].marka = urunbilgi.marka;
            }

            for (let index = 0; index < order[i].iadeler.length; index++) {
                let urunbilgi = await Product.findById(
                    order[i].iadeler[index].urun_id
                );
                order[i].iadeler[index].ad = urunbilgi.ad;
                order[i].iadeler[index].photo = urunbilgi.photo;
                order[i].iadeler[index].kategori_id = urunbilgi.kategori_id;
                order[i].iadeler[index].marka = urunbilgi.marka;
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
