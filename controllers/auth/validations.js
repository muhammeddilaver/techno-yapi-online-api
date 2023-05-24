import Joi from "joi";

const RegisterValidation = Joi.object({
    ad: Joi.string().required(),
    firma_ad: Joi.string().required(),
    telefon: Joi.string().required(),
    email: Joi.string().email().required(),
    adres: Joi.string().required(),
    sifre: Joi.string().min(6).required(),
});

const LoginValidation = Joi.object({
    email: Joi.string().email().required(),
    sifre: Joi.string().min(6).required(),
});

export {RegisterValidation, LoginValidation};
