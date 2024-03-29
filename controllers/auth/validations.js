import Joi from "joi";

const RegisterValidation = Joi.object({
    name: Joi.string().required(),
    company_name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().allow(''),
    password: Joi.string().min(6).required(),
    vno: Joi.number(),
});

const LoginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

export {RegisterValidation, LoginValidation};
