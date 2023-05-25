import Joi from 'joi';

const ProductSchema = Joi.object({
  name: Joi.string().required(),
  inventory: Joi.number(),
  price: Joi.number().required(),
  factor: Joi.number(),
  description: Joi.string(),
  photos: Joi.string(),
  status: Joi.boolean(),
  brand: Joi.string(),
  category_id: Joi.string(),
});

export default ProductSchema;
