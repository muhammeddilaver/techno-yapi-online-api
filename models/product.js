import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    inventory: {
        type: Number,
    },
    price: {
        type: Number,
    },
    factor: {
        type: Number,
    },
    description: {
        type: String,
    },
    photos: {
        type: [String],
    },
    status: {
        type: Boolean,
    },
    brand: {
        type: String,
    },
    category_id: {
        type: Schema.Types.ObjectId,
    },
});

const Product = mongoose.model("product", ProductSchema);

export default Product;
