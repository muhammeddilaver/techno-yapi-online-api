import mongoose from "mongoose";

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
    },
    products: [
        {
            product_id: {
                type: Schema.Types.ObjectId,
            },
            price: {
                type: Number,
            },
            piece: {
                type: Number,
            },
            return: {
                type: Number,
                default: 0,
            },
        },
    ],
    order_date: {
        type: Date,
        default: Date.now,
    },
    delivery_date: {
        type: Date,
    },
    status: {
        /*
            {
                siparisverildi: 1,
                siparisteslimatta: 2,
                siparisteslimedildi: 3,
                siparisiptal: 0,
            }
        */
        type: Number,
        default: 1,
    },
    total_price: {
        type: Number,
    },
    description: {
        type: String,
        default: "",
    },
});

const Order = mongoose.model("orders", OrderSchema);

export default Order;
