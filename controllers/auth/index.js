import Auth from "../../models/auth.js";
import Order from "../../models/order.js";
import Payments from "../../models/payments.js";
import mongoose from "mongoose";

import Boom from "boom";

import moment from "moment";
import { format } from "number-currency-format-2";
import puppeteer from "puppeteer";

import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../../helpers/jwt.js";

import { LoginValidation, RegisterValidation } from "./validations.js";
import redis from "../../config/redis.js";
import { makeCaseInsensitiveRegexPattern } from "../../helpers/searchHack.js";

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

const GetAccountStatement = async (req, res, next) => {
    req.params.user_id = req.params.user_id || req.payload.user_id;
    req.params.endDate = req.params.endDate || new Date();

    if (!req.params.startDate) {
        req.params.startDate = new Date();
        req.params.startDate.setMonth(req.params.startDate.getMonth() - 5);
    }

    try {
        const payments = await Payments.find({
            user_id: new mongoose.Types.ObjectId(req.params.user_id),
            date: {
                $gte: req.params.startDate,
                $lte: req.params.endDate,
            },
        });

        const orders = await Order.find({
            user_id: new mongoose.Types.ObjectId(req.params.user_id),
            delivery_date: {
                $gte: req.params.startDate,
                $lte: req.params.endDate,
            },
            status: 6,
        });

        const mergedList = [...orders, ...payments];
        mergedList.sort(
            (a, b) =>
                new Date(a.delivery_date || a.date) -
                new Date(b.delivery_date || b.date)
        );

        res.json(mergedList);
    } catch (error) {
        next(error);
    }
};

const GetBalance = async (req, res, next) => {
    if (!req.params.user_id) {
        req.params.user_id = req.payload.user_id;
    }

    try {
        const payments = await Payments.find({ user_id: req.params.user_id });
        const orders = await Order.find({
            user_id: req.params.user_id,
            status: 6,
        });

        const totalPayments = payments.reduce(
            (total, payment) => total + payment.price,
            0
        );
        const totalOrders = orders.reduce(
            (total, order) => total + order.total_price,
            0
        );

        const result = totalOrders - totalPayments;

        res.json({
            user_id: req.params.user_id,
            totalPayments,
            totalOrders,
            result,
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

const GetUser = async (req, res, next) => {
    const user_id = req.params.user_id;

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
        const users = await Auth.find(
            keyword !== "full"
                ? {
                      $or: [
                          {
                              company_name: {
                                  $regex: new RegExp(
                                      makeCaseInsensitiveRegexPattern(keyword),
                                      "i"
                                  ),
                              },
                          },
                          {
                              name: {
                                  $regex: new RegExp(
                                      makeCaseInsensitiveRegexPattern(keyword),
                                      "i"
                                  ),
                              },
                          },
                      ],
                  }
                : {}
        ).limit(20);

        if (users.length == 0) {
            return next(Boom.notFound("User is not found."));
        }

        res.json(users);
    } catch (e) {
        next(e);
    }
};

const GetAccountPDF = async (req, res, next) => {
    req.params.user_id = req.params.user_id || req.payload.user_id;

    try {
        const client = await Auth.findById(req.params.user_id);

        const payments = await Payments.find({
            user_id: new mongoose.Types.ObjectId(req.params.user_id),
        });

        const orders = await Order.find({
            user_id: new mongoose.Types.ObjectId(req.params.user_id),
            status: 6,
        });

        const mergedList = [...orders, ...payments];
        mergedList.sort(
            (a, b) =>
                new Date(a.delivery_date || a.date) -
                new Date(b.delivery_date || b.date)
        );

        const totalPayments = payments.reduce(
            (total, payment) => total + payment.price,
            0
        );
        const totalOrders = orders.reduce(
            (total, order) => total + order.total_price,
            0
        );

        const result = totalOrders - totalPayments;

        let content = `<!DOCTYPE html>
			<html dir="ltr" lang="tr-TR">
			<head>
				<meta charset="UTF-8" />
				<style type="text/css">
					#mainbody {
						background-color: #FFFFFF;
						font-family: 'Tahoma', "Times New Roman", Times, serif;
						font-size: 11px;
						color: #666666;
					}
					#mainbody h1,
					#mainbody h2 {
						padding-bottom: 3px;
						padding-top: 3px;
						margin-bottom: 5px;
						text-transform: uppercase;
						font-family: Arial, Helvetica, sans-serif;
					}
					#mainbody h1 {
						font-size: 2.5em;
						text-transform: none;
					}
					#mainbody h2 {
						font-size: 1em;
						color: brown;
					}
					#mainbody h3 {
						font-size: 1em;
						color: #333333;
						text-align: justify;
						margin: 0;
						padding: 0;
					}
					#mainbody h4 {
						font-size: 1.1em;
						font-style: bold;
						font-family: Arial, Helvetica, sans-serif;
						color: #000000;
						margin: 0;
						padding: 0;
					}
					#mainbody hr {
						height: 2px;
						color: #000000;
						background-color: #000000;
						border-bottom: 1px solid #000000;
					}
					#mainbody p,
					#mainbody ul,
					#mainbody ol {
						margin-top: 1.5em;
					}
					#mainbody ul,
					#mainbody ol {
						margin-left: 3em;
					}
					#mainbody blockquote {
						margin-left: 3em;
						margin-right: 3em;
						font-style: italic;
					}
					#mainbody a {
						text-decoration: none;
						color: #70A300;
					}
					#mainbody a:hover {
						border: none;
						color: #70A300;
					}
					#despatchTable {
						border-collapse: collapse;
						font-size: 11px;
						float: right;
						border-color: gray;
					}
					#ettnTable {
						border-collapse: collapse;
						font-size: 11px;
						border-color: gray;
					}
					#customerPartyTable {
						border-width: 0px;
						border-style: inset;
						border-color: gray;
						border-collapse: collapse;
						background-color:
					}
					#customerIDTable {
						border-width: 2px;
						border-style: inset;
						border-color: gray;
						border-collapse: collapse;
					}
					#customerIDTableTd {
						border-width: 2px;
						border-style: inset;
						border-color: gray;
						border-collapse: collapse;
					}
					#lineTable {
						border-width: 2px;
						border-style: inset;
						border-color: black;
						border-collapse: collapse;
					}
					#mainbody td.lineTableTd {
						border-width: 1px;
						padding: 1px;
						border-style: inset;
						border-color: black;
						background-color: white;
					}
					#mainbody tr.lineTableTr {
						border-width: 1px;
						padding: 0px;
						border-style: inset;
						border-color: black;
						background-color: white;
					}
					#lineTableDummyTd {
						border-width: 1px;
						border-color: white;
						padding: 1px;
						border-style: inset;
						border-color: black;
						background-color: white;
					}
					#mainbody td.lineTableBudgetTd {
						border-width: 2px;
						border-spacing: 0px;
						padding: 1px;
						border-style: inset;
						border-color: black;
						background-color: white;
					}
					#notesTable {
						border-width: 2px;
						border-style: inset;
						border-color: black;
						border-collapse: collapse;
						background-color:
					}
					#notesTableTd {
						border-width: 0px;
						border-style: inset;
						border-color: black;
						border-collapse: collapse;
						background-color:
					}
					#mainbody table {
						border-spacing: 0px;
					}
					#budgetContainerTable {
						border-width: 0px;
						border-spacing: 0px;
						border-style: inset;
						border-color: black;
						border-collapse: collapse;
					}
					#mainbody td {
						border-color: gray;
					}
				</style>
				<title>Hesap Özeti</title>
			</head>
			
			<body style="margin-left=0.6in; margin-right=0.6in; margin-top=0.79in; margin-bottom=0.79in" id="mainbody">
				<table cellpadding="0px" width="800" cellspacing="0px" border="0" style="border-color:"blue; ">
					<tbody>
						<tr>
							<td align="center" colspan="5">
								<h1>Hesap Özeti</h1>
							</td>
						</tr>
						<tr valign="top">
							</td>
							<td width="5%"></td>
							<td width="5%"></td>
							<td width="5%"></td>
							<td align="right">
								<div style="visibility: hidden; height: 20px;width: 20px; ; display:none" id="qrvalue">
									{"vkntckn":"26567515344", "avkntckn":"58279107166 ", "senaryo":"EARSIVFATURA",
									"tip":"SATIS",
									"tarih":"2023-09-09", "no":"GIB2023000000138",
									"ettn":"ac0920ae-aa44-4ec0-a3e3-0f87d25463a7",
									"parabirimi":"TRY",
									"malhizmettoplam":"26940.48", "kdvmatrah(20)":"18858.34",
									"hesaplanankdv(20)":"3771.66","vergidahil":"22630", "odenecek":"22630"}</div>
								<script type="text/javascript">
									var qrcode = new QRCode(document.getElementById("qrcode"), {
										width: 220,
										height: 220,
										correctLevel: QRCode.CorrectLevel.H
									});
			
									function makeCode(msg) {
										var elText = document.getElementById("text");
			
										qrcode.makeCode(msg);
									}
			
									makeCode(document.getElementById("qrvalue").innerHTML);
								</script>
							</td>
						</tr>
						<tr valign="top" style="height:118px; ">
							<td valign="bottom" align="right" width="40%">
								<table border="0" align="left" id="customerPartyTable">
									<tbody>
										<tr style="height:71px; ">
											<td>
												<hr>
												<table border="0" align="center">
													<tbody>
														<tr>
															<td align="left" style="width:469px; "><span
																	style="font-weight:bold; ">SAYIN</span></td>
														</tr>
														<tr>
															<td align="left" style="width:469px; ">${client.name}</td>
														</tr>
														<tr align="left">
															<td align="left" style="width:469px; ">Tel: Fax: ${client.phone}</td>
														</tr>
													</tbody>
												</table>
												<hr>
											</td>
										</tr>
									</tbody>
								</table><br>
							</td>
							<td align="right" width="20%"></td>
							<td colspan="2" valign="bottom" align="center" width="40%">
								<table id="despatchTable" border="1">
									<tbody>
										<tr style="height:13px; ">
											<td align="left"><span style="font-weight:bold; ">Ekstre Tarihi:</span></td>
											<td align="left">${moment(new Date()).format("DD.MM.YYYY HH:mm")}</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
						<tr>
							<td><br></td>
						</tr>
					</tbody>
				</table>
				<div id="lineTableAligner"><span>&nbsp;</span></div>
				<table width="800" id="lineTable" border="1">
					<tbody>
						<tr class="lineTableTr">
							<td align="center" style="width:7%" class="lineTableTd"><span style="font-weight:bold;">Tarih</span>
							</td>
							<td align="center" style="width:20%" class="lineTableTd"><span style="font-weight:bold;">Açıklama</span>
							</td>
							<td align="center" style="width:7.4%" class="lineTableTd"><span style="font-weight:bold;">İşlem</span>
							</td>
							<td align="center" style="width:9%" class="lineTableTd"><span style="font-weight:bold;">Alacak</span>
							</td>
							<td align="center" style="width:10.6%" class="lineTableTd"><span style="font-weight:bold;">Borç</span>
							</td>
						</tr>`;

        for (const item of mergedList) {
            content += `
			<tr class="lineTableTr">
			<td class="lineTableTd">${moment(item.date ? item.date : item.delivery_date).format("DD.MM.YYYY HH:mm")}</td>
			<td class="lineTableTd">${item.description}</td>
			<td align="right" class="lineTableTd">${
                item.delivery_date ? "Sipariş" : item.price ? "Ödeme" : ""
            }</td>
			<td align="right" class="lineTableTd">${item.price ? format(item.price.toFixed(2), {
                currency: "₺",
                decimalSeparator: ",",
                thousandSeparator: ".",
            }) : ""}</td>
			<td align="right" class="lineTableTd">${item.total_price ? format(item.total_price.toFixed(2), {
                currency: "₺",
                decimalSeparator: ",",
                thousandSeparator: ".",
            }): ""}</td>
		</tr>`;
        }

        content += `</tbody>
			</table>
			<table width="800px" table-layout="fixed" id="budgetContainerTable">
				<tbody>
					<tr>
						<td valign="top" align="right">
							<table>
								<tbody>
									<tr align="right">
										<td></td>
										<td width="200px" align="right" class="lineTableBudgetTd"><span
												style="font-weight:bold; ">Güncel Bakiye ${result > 0 ? "(BORÇ)" : result === 0 ? "" : "(ALACAK)"}</span></td>
										<td align="right" style="width:81px; " class="lineTableBudgetTd">${format(result.toFixed(2), {
                                            currency: "₺",
                                            decimalSeparator: ",",
                                            thousandSeparator: ".",
                                        })}</td>
									</tr>
								</tbody>
							</table>
						</td>
					</tr>
				</tbody>
			</table><br><br>
		</body>
		</html>
        `;

        const marginOptions = {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
        };

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent(content);

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: marginOptions,
        });

        await browser.close();


        res.contentType("application/pdf");
        res.send(pdfBuffer);
    } catch (e) {
        next(e);
    }
};

export default {
    CreatePayment,
    GetBalance,
    GetAccountStatement,
    Register,
    Login,
    RefreshToken,
    Logout,
    Me,
    UsersList,
    UsersSearch,
    GetUser,
    GetAccountPDF,
};
