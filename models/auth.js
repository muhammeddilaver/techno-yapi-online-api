import mongoose from 'mongoose';
import bcrypt from "bcryptjs";

const AuthSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    company_name: {
        type: String
    }, 
    phone: {
        type: String
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    password: {
        type: String
    },
    vno: {
        type: Number
    },
    role: {
		type: String,
		default: "user",
		enum: ["user", "admin"],
	},
});

AuthSchema.pre("save", async function (next) {
    try {
        if (this.isNew) {
            const salt = await bcrypt.genSalt(10);
			const hashed = await bcrypt.hash(this.password, salt);
			this.password = hashed;
        }

        next();
    } catch (error) {
        next(error);
    }
});

AuthSchema.methods.isValidPass = async function (pass) {
    return await bcrypt.compare(pass, this.password);
}

const Auth = mongoose.model('auth', AuthSchema);

export default Auth;