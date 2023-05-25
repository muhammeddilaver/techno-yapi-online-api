import Joi from "joi";

const OrderSchema = Joi.object({
    products: Joi.string(),
    returns: Joi.string(),
    order_date: Joi.date(),
    delivery_date: Joi.date(),
    status: Joi.number(),
    description: Joi.string(),
});

export { OrderSchema };
