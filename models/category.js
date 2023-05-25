import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    parent_category_id: {
        type: Schema.Types.ObjectId
    }
});

const Category = mongoose.model("category", CategorySchema);

export default Category;
