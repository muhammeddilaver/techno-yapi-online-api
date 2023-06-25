import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PaymentsSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
    },
    price: {
        type: Number,
    },
    description: {
        type: String,
        default: "",
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Payments = mongoose.model("payments", PaymentsSchema);

export default Payments;
