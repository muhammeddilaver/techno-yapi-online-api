import Joi from "joi";

const CategorySchema = Joi.object({
    name: Joi.string().required(),
    parent_category_id: Joi.string(),
});

export {CategorySchema};
