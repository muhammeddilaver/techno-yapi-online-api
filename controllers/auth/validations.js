import Joi from "joi";

const RegisterValidation = Joi.object({
    ad: Joi.string().required(),
    company_name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    password: Joi.string().min(6).required(),
});

const LoginValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

export {RegisterValidation, LoginValidation};
