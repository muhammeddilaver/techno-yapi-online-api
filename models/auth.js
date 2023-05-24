import mongoose from 'mongoose';
import bcrypt from "bcryptjs";

const AuthSchema = new mongoose.Schema({
    ad: {
        type: String,
        required: true
    },
    firma_ad: {
        type: String
    }, 
    telefon: {
        type: String
    },
    email: {
        type: String
    },
    adres: {
        type: String
    },
    sifre: {
        type: String
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
			const hashed = await bcrypt.hash(this.sifre, salt);
			this.sifre = hashed;
        }

        next();
    } catch (error) {
        next(error);
    }
});

AuthSchema.methods.isValidPass = async function (pass) {
    return await bcrypt.compare(pass, this.sifre);
}

const Auth = mongoose.model('auth', AuthSchema);

export default Auth;