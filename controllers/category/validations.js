import Joi from "joi";

const CategorySchema = Joi.object({
    ad: Joi.string().required(),
    ust_kategori_id: Joi.string(),
});

const LoginValidation = Joi.object({
    email: Joi.string().email().required(),
    sifre: Joi.string().min(6).required(),
});

export {CategorySchema, LoginValidation};
