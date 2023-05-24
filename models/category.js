import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    ad: {
        type: String,
        required: true
    },
    ust_kategori_id: {
        type: Schema.Types.ObjectId
    }
});

const Category = mongoose.model("category", CategorySchema);

export default Category;
