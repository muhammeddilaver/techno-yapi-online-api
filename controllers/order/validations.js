import Joi from "joi";

export const OrderSchema = Joi.object({
    products: Joi.string(),
    order_date: Joi.date(),
    delivery_date: Joi.date(),
    status: Joi.number(),
    description: Joi.string(),
});

export const CreateOrderSchema = Joi.object({
    products: Joi.array().items(
        Joi.object({
            _id: Joi.string(),
            name: Joi.string(),
            brand: Joi.string().allow(''),
            category_id: Joi.string(),
            currency: Joi.string(),
            factor: Joi.number(),
            inventory: Joi.number(),
            price: Joi.number(),
            status: Joi.boolean(),
            photos: Joi.array(),
            piece: Joi.number().required(),
        })
    ).required(),
    status: Joi.number().required(),
    description: Joi.string().allow(''),
});