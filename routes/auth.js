import express from "express";
import auth from "../controllers/auth/index.js";
import { verifyAccessToken } from "../helpers/jwt.js";
import grantAccess from "../middleware/grantAccess.js";

const router = express.Router();

router.post('/register', auth.Register);
router.post('/login', auth.Login);
router.post('/refresh_token', auth.RefreshToken);
router.post('/logout', auth.Logout);
router.get('/me', verifyAccessToken, auth.Me);

router.get('/users', verifyAccessToken, grantAccess("createAny", "allProject"), auth.UsersList);
router.get('/users/search/:keyword', verifyAccessToken, grantAccess("createAny", "allProject"), auth.UsersSearch);

router.post('/payment', verifyAccessToken, grantAccess("createAny", "allProject"), auth.CreatePayment);

router.get('/balance/:user_id', verifyAccessToken, grantAccess("createAny", "allProject"), auth.GetBalance);
router.get('/balance', verifyAccessToken, auth.GetBalance);

router.get('/summary/:user_id', verifyAccessToken, grantAccess("createAny", "allProject"), auth.GetAccountStatement);
router.get('/summary/', verifyAccessToken, auth.GetAccountStatement);


export default router;