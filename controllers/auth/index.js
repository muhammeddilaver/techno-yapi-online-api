import Auth from "../../models/auth.js";
import Order from "../../models/order.js";
import Boom from "boom";

import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../../helpers/jwt.js";

import { LoginValidation, RegisterValidation } from "./validations.js";
import redis from "../../config/redis.js";
import Payments from "../../models/payments.js";

const CreatePayment = async (req, res, next) => {
    const input = req.body;

    try {
        const payment = new Payments(input);
        const savedData = await payment.save();
        res.json(savedData);
    } catch (error) {
        next(error);
    }
};

const GetBalance = async (req, res, next) => {
    if(!req.params.user_id){
        req.params.user_id = req.payload.user_id;
    }

    try {
        const payments = await Payments.find({user_id: req.params.user_id});
        const orders = await Order.find({user_id: req.params.user_id, status: 6});
        
        const totalPayments = payments.reduce((total, payment) => total + payment.price, 0);
        const totalOrders = orders.reduce((total, order) => total + order.total_price, 0);

        const result = totalOrders - totalPayments;

        res.json({
            user_id: req.params.user_id,
            totalPayments,
            totalOrders,
            result
        });
    } catch (error) {
        next(error);
    }
};

const Register = async (req, res, next) => {
    const input = req.body;

    const { error } = RegisterValidation.validate(input);

    if (error) {
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

        delete userData.password;
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
            throw Boom.unauthorized("The email address was not found.");
        }

        const isMatched = await user.isValidPass(input.password);
        if (!isMatched) {
            throw Boom.unauthorized("email or password not correct");
        }

        const accessToken = await signAccessToken({
            user_id: user._id,
            role: user.role,
        });

        const refreshToken = await signRefreshToken(user._id);

        const userData = user.toObject();
        delete userData.password;
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

        const deleteUserData = async (user_id) => {
            return new Promise((resolve, reject) => {
                redis.del(user_id, (err, reply) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(reply);
                    }
                });
            });
        };

        const data = await deleteUserData(user_id);

        console.log(data);

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
        const user = await Auth.findById(user_id).select("-password -__v");

        res.json(user);
    } catch (e) {
        next(e);
    }
};

const UsersList = async (req, res, next) => {
    try {
        const users = await Auth.find({});

        res.json(users);
    } catch (e) {
        next(e);
    }
};

const UsersSearch = async (req, res, next) => {

    const { keyword } = req.params;

    if (!keyword) {
        return next(Boom.badRequest("Missing paramter (:keyword)"));
    }

    try {
        const users = await Auth.find({
            company_name: { $regex: new RegExp(keyword, "i") },
        });

        if (users.length == 0) {
            return next(Boom.notFound("User is not found."));
        }

        res.json(users);
    } catch (e) {
        next(e);
    }
};

export default {
    CreatePayment,
    GetBalance,
    Register,
    Login,
    RefreshToken,
    Logout,
    Me,
    UsersList,
    UsersSearch,
};
