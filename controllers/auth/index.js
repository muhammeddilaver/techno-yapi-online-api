import Auth from "../../models/auth.js";
import Boom from "boom";

import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../../helpers/jwt.js";

import {LoginValidation, RegisterValidation} from "./validations.js";
import redis from "../../config/redis.js";

const Register = async (req, res, next) => {
    const input = req.body;

    const { error } = RegisterValidation.validate(input);

    if (error) {
        console.log(123);
        return next(Boom.badRequest(error.details[0].message));
    }

    try {
        const isExists = await Auth.findOne({ email: input.email });

        if (isExists) {
            return next(Boom.conflict("This e-mail already using."));
        }

        const user = new Auth(input);
        const data = await user.save();
        const userData = data.toObject();

        delete userData.sifre;
        delete userData.__v;

        const accessToken = await signAccessToken({
            user_id: user._id,
            role: user.role,
        });
        const refreshToken = await signRefreshToken(user._id);

        res.json({
            user: userData,
            accessToken,
            refreshToken,
        });
    } catch (error) {
		next(error);
	}
};

const Login = async (req, res, next) => {
    const input = req.body;

    const { error } = LoginValidation.validate(input);

    if (error) {
        return next(Boom.badRequest(error.details[0].message));
    }

    try {
        const user = await Auth.findOne({ email: input.email });

        if (!user) {
            throw Boom.notFound("The email address was not found.");
        }

        const isMatched = await user.isValidPass(input.sifre);
        if (!isMatched) {
            throw Boom.unauthorized("email or password not correct");
        }

        const accessToken = await signAccessToken({
            user_id: user._id,
            role: user.role,
        });
        const refreshToken = await signRefreshToken(user._id);

        const userData = user.toObject();
        delete userData.sifre;
        delete userData.__v;

        res.json({ user: userData, accessToken, refreshToken });
    } catch (e) {
        return next(e);
    }
};

const RefreshToken = async (req, res, next) => {
	const { refresh_token } = req.body;

	try {
		if (!refresh_token) {
			throw Boom.badRequest();
		}

		const user_id = await verifyRefreshToken(refresh_token);
		const accessToken = await signAccessToken(user_id);
		const refreshToken = await signRefreshToken(user_id);

		res.json({ accessToken, refreshToken });
	} catch (e) {
		next(e);
	}
};

const Logout = async (req, res, next) => {
	try {
		const { refresh_token } = req.body;
		if (!refresh_token) {
			throw Boom.badRequest();
		}

		const user_id = await verifyRefreshToken(refresh_token);
        redis
		const data = await redis.del(user_id);

		if (!data) {
			throw Boom.badRequest();
		}

		res.json({ message: "success" });
	} catch (e) {
		console.log(e);
		return next(e);
	}
};

const Me = async (req, res, next) => {
	const { user_id } = req.payload;

	try {
		const user = await Auth.findById(user_id).select("-sifre -__v");

		res.json(user);
	} catch (e) {
		next(e);
	}
};

export default { 
	Register, 
	Login, 
    RefreshToken,
    Logout,
    Me
};
