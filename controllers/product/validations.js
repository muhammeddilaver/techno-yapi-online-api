import Joi from 'joi';

const ProductSchema = Joi.object({
  ad: Joi.string().required(),
  stok: Joi.number(),
  fiyat: Joi.number().required(),
  carpan: Joi.number(),
  aciklama: Joi.string(),
  photo: Joi.string(),
  durum: Joi.boolean(),
  marka: Joi.string(),
  kategori_id: Joi.string(),
});

export default ProductSchema;
