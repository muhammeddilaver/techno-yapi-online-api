import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    ad: {
        type: String,
        required: true,
    },
    stok: {
        type: Number,
    },
    fiyat: {
        type: Number,
    },
    carpan: {
        type: Number,
    },
    aciklama: {
        type: String,
    },
    photos: {
        type: [String],
    },
    durum: {
        type: Boolean,
    },
    marka: {
        type: String,
    },
    kategori_id: {
        type: Schema.Types.ObjectId,
    },
});

const Product = mongoose.model("product", ProductSchema);

export default Product;
