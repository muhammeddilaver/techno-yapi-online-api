import mongoose from "mongoose";

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    musteri_id: {
        type: Schema.Types.ObjectId,
    },
    urunler: [
        {
            urun_id: {
                type: Schema.Types.ObjectId,
            },
            fiyat: {
                type: Number,
            },
            adet: {
                type: Number,
            },
        },
    ],
    iadeler: [
        {
            urun_id: {
                type: Schema.Types.ObjectId,
            },
            fiyat: {
                type: Number,
            },
            adet: {
                type: Number,
            },
        },
    ],
    siparistarih: {
        type: Date,
        default: Date.now,
    },
    teslimattarih: {
        type: Date,
    },
    durum: {
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
    tutar: {
        type: Number,
    },
    aciklama: {
        type: String,
    },
});

const Order = mongoose.model("orders", OrderSchema);

export default Order;
