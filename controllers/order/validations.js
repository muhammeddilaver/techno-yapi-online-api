import Joi from "joi";

const OrderSchema = Joi.object({
    urunler: Joi.string(),
    iadeler: Joi.string(),
    siparistarih: Joi.date(),
    teslimattarih: Joi.date(),
    durum: Joi.number(),
    aciklama: Joi.string(),
});

export { OrderSchema };
