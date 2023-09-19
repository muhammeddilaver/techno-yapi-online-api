import Product from "../../models/product.js";
import Order from "../../models/order.js";

import "dotenv/config.js";

import Boom from "boom";
import { CreateOrderSchema } from "./validations.js";
import mongoose from "mongoose";
import { currencyRates } from "../../helpers/currency.js";

import moment from "moment";
import { format } from "number-currency-format-2";
import puppeteer from "puppeteer";
import Payments from "../../models/payments.js";

const limit = 12;

const Create = async (req, res, next) => {
    const input = req.body;
    const { error } = CreateOrderSchema.validate(input);

    if (error) {
        return next(Boom.badRequest(error.details[0].message));
    }

    const { dolar, euro } = await currencyRates();

    try {
        input.user_id = req.payload.user_id;
        input.total_price = 0;
        input.products = new mongoose.Types.Array(input.products);
        input.status = input.status === 1 ? 1 : 3;

        for (let i = 0; i < input.products.length; i++) {
            if (input.products[i]._id) {
                let product_info = await Product.findById(
                    new mongoose.Types.ObjectId(input.products[i]._id)
                );
                product_info.price =
                    product_info.price *
                    (product_info.currency === "TL"
                        ? 1
                        : product_info.currency === "DOLAR"
                        ? dolar
                        : product_info.currency === "EURO"
                        ? euro
                        : 0);
                input.products[i].price =
                    product_info.price +
                    (product_info.price * product_info.factor) / 100;
                input.total_price +=
                    input.products[i].price * input.products[i].piece;
            } else {
                const product = new Product({
                    photos: [],
                    brand: "",
                    category_id: new mongoose.Types.ObjectId(
                        "646a7d15ffb4ef83553f20b3"
                    ),
                    factor: 0,
                    inventory: 100,
                    name: input.products[i].name,
                    price: 0,
                    currency: "TL",
                    status: false,
                });
                const savedProductData = await product.save();
                input.products[i]._id = savedProductData._id;
                input.products[i].price = 0;
            }
        }

        const order = new Order(input);
        const savedData = await order.save();

        res.json(savedData);
    } catch (e) {
        next(e);
    }
};

const AdminCreate = async (req, res, next) => {
    const input = req.body;

    const { dolar, euro } = await currencyRates();

    try {
        /* input.total_price = 0; */
        input.products = new mongoose.Types.Array(input.products);
        input.status = parseInt(input.status);

        for (let i = 0; i < input.products.length; i++) {
            if (input.products[i]._id) {
                let product_info = await Product.findById(
                    new mongoose.Types.ObjectId(input.products[i]._id)
                );

                if (product_info.price !== input.products[i].exact_price) {
                    await Product.findByIdAndUpdate(input.products[i]._id, {
                        price: input.products[i].exact_price,
                    });
                }
                if (product_info.factor !== input.products[i].factor) {
                    await Product.findByIdAndUpdate(input.products[i]._id, {
                        factor: input.products[i].factor,
                    });
                }
                if (product_info.currency !== input.products[i].currency) {
                    await Product.findByIdAndUpdate(input.products[i]._id, {
                        currency: input.products[i].currency,
                    });
                }

                /* input.products[i].price =
                    input.products[i].exact_price *
                    (input.products[i].currency === "TL"
                        ? 1
                        : input.products[i].currency === "DOLAR"
                        ? dolar
                        : input.products[i].currency === "EURO"
                        ? euro
                        : 0);   */
            } else {
                const product = new Product({
                    photos: [],
                    brand: "",
                    category_id: new mongoose.Types.ObjectId(
                        "646a7d15ffb4ef83553f20b3"
                    ),
                    factor: input.products[i].factor,
                    inventory: 100,
                    name: input.products[i].name,
                    price: input.products[i].exact_price,
                    currency: input.products[i].currency,
                    status: true,
                });
                const savedProductData = await product.save();
                input.products[i]._id = savedProductData._id;
            }
            /* input.total_price +=
                    input.products[i].price * input.products[i].piece; */

            delete input.products[i].name;
            delete input.products[i].factor;
            delete input.products[i].brand;
            delete input.products[i].photos;
            delete input.products[i].inventory;
            delete input.products[i].status;
            delete input.products[i].currency;
            delete input.products[i].exact_price;
        }

        const order = new Order(input);
        const savedData = await order.save();

        res.json(savedData);
        /* res.json({});  */
    } catch (e) {
        next(e);
    }
};

const GetList = async (req, res, next) => {
    let { page } = req.query;

    if (page < 1 || !page) {
        page = 1;
    }

    const skip = (parseInt(page) - 1) * limit;

    try {
        const orders = await Order.aggregate()
            .match({
                user_id: new mongoose.Types.ObjectId(req.payload.user_id),
            })
            .sort({ order_date: -1 })
            .skip(skip)
            .limit(limit)
            .lookup({
                from: "auths",
                localField: "user_id",
                foreignField: "_id",
                as: "client",
            })
            .unwind({
                path: "$client",
                preserveNullAndEmptyArrays: true,
            })
            .project({
                "client.password": 0,
                "client.__v": 0,
                "client._id": 0,
                "client.role": 0,
            });

        res.json(orders);
    } catch (e) {
        next(e);
    }
};

const GetListAdmin = async (req, res, next) => {
    let { page, client, startDate, endDate } = req.query;

    if (page < 1 || !page) {
        page = 1;
    }

    const skip = (parseInt(page) - 1) * limit;

    try {
        const orders = await Order.aggregate()
            .match({
                $and: [
                    client
                        ? { user_id: new mongoose.Types.ObjectId(client) }
                        : {},
                    startDate && endDate
                        ? {
                              order_date: {
                                  $gte: moment(
                                      startDate,
                                      "DD/MM/YYYY"
                                  ).toDate(),
                                  $lte: moment(endDate, "DD/MM/YYYY").toDate(),
                              },
                          }
                        : {},
                ],
            })
            .sort({ order_date: -1 })
            .skip(skip)
            .limit(limit)
            .lookup({
                from: "auths",
                localField: "user_id",
                foreignField: "_id",
                as: "client",
            })
            .unwind({
                path: "$client",
                preserveNullAndEmptyArrays: true,
            })
            .project({
                "client.password": 0,
                "client.__v": 0,
                "client._id": 0,
                "client.role": 0,
            });

        res.json(orders);
    } catch (e) {
        next(e);
    }
};

const Get = async (req, res, next) => {
    const { order_id } = req.params;

    if (!order_id) {
        return next(Boom.badRequest("Missing paramter (:order_id)"));
    }

    try {
        const order = await Order.aggregate()
            .match({
                _id: new mongoose.Types.ObjectId(order_id),
            })
            .lookup({
                from: "auths",
                localField: "user_id",
                foreignField: "_id",
                as: "client",
            })
            .unwind({
                path: "$client",
                preserveNullAndEmptyArrays: true,
            });

        if (
            req.payload.role !== "admin" &&
            order[0].user_id != req.payload.user_id
        ) {
            return next(Boom.badRequest("This order is not yours."));
        }

        for (let index = 0; index < order[0].products.length; index++) {
            let product_info = await Product.findById(
                order[0].products[index]._id
            );
            order[0].products[index].name = product_info.name;
            order[0].products[index].photos = product_info.photos;
            order[0].products[index].category_id = product_info.category_id;
            order[0].products[index].brand = product_info.brand;
        }

        res.json(order);
    } catch (e) {
        next(e);
    }
};

const GetAdmin = async (req, res, next) => {
    const { order_id } = req.params;

    if (!order_id) {
        return next(Boom.badRequest("Missing paramter (:order_id)"));
    }

    try {
        const order = await Order.aggregate()
            .match({
                _id: new mongoose.Types.ObjectId(order_id),
            })
            .lookup({
                from: "auths",
                localField: "user_id",
                foreignField: "_id",
                as: "client",
            })
            .unwind({
                path: "$client",
                preserveNullAndEmptyArrays: true,
            });

        if (
            req.payload.role !== "admin" &&
            order[0].user_id != req.payload.user_id
        ) {
            return next(Boom.badRequest("This order is not yours."));
        }

        for (let index = 0; index < order[0].products.length; index++) {
            let product_info = await Product.findById(
                order[0].products[index]._id
            );
            order[0].products[index].name = product_info.name;
            order[0].products[index].photos = product_info.photos;
            order[0].products[index].category_id = product_info.category_id;
            order[0].products[index].brand = product_info.brand;
            order[0].products[index].status = product_info.status;
            order[0].products[index].currency = product_info.currency;
            if (order[0].status === 1 || order[0].status === 3) {
                order[0].products[index].exact_price = product_info.price;
                order[0].products[index].factor = product_info.factor;
            }
        }

        res.json(order);
    } catch (e) {
        next(e);
    }
};

const AcceptOrRejectOffer = async (req, res, next) => {
    const { order_id } = req.params;
    const status = req.body.status === 2 ? 4 : 7;
    const order = await Order.findById(new mongoose.Types.ObjectId(order_id));

    if (order.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    }

    if (order.status !== 2) {
        return next(Boom.badRequest("This order is not delivered."));
    }

    try {
        const updated = await Order.findByIdAndUpdate(order_id, {
            status: status,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
}; //npm install -g npm@9.8.1

const Return = async (req, res, next) => {
    const { order_id } = req.params;
    const input = req.body;
    const order = await Order.findById(new mongoose.Types.ObjectId(order_id));
    const productIndexId = order.products.findIndex((product) => {
        return product._id.toString() === input.returnProductId;
    });

    if (order.status !== 6) {
        return next(Boom.badRequest("This order is not delivered."));
    }

    try {
        order.products[productIndexId].return =
            order.products[productIndexId].return + parseInt(input.returnCount);

        order.products[productIndexId].piece =
            order.products[productIndexId].piece - parseInt(input.returnCount);
        order.total_price =
            order.total_price -
            order.products[productIndexId].price * parseInt(input.returnCount);

        const updated = await Order.findByIdAndUpdate(order_id, order);

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const DeleteProduct = async (req, res, next) => {
    const { order_id } = req.params;
    const input = req.body;
    const order = await Order.findById(new mongoose.Types.ObjectId(order_id));

    const productIndex = order.products.findIndex(
        (product) => product._id.toString() === input.deleteProductId
    );
    const deletePrice =
        order.products[productIndex].price * order.products[productIndex].piece;

    order.products = order.products.filter(
        (product) => product._id.toString() !== input.deleteProductId
    );

    order.total_price = order.total_price - deletePrice;

   /*  if (order.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    } */

    if (order.status === 6) {
        return next(
            Boom.badRequest(
                "This order is delivered. You can not delete any item"
            )
        );
    }

    try {
        const updated = await Order.findByIdAndUpdate(order_id, order, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const AddProductToOrder = async (req, res, next) => {
    const { order_id } = req.params;
    const input = req.body;
    let order = await Order.findById(new mongoose.Types.ObjectId(order_id));

    const { dolar, euro } = await currencyRates();

    let product_info = null;

    if (input.product_id !== "0") {
        product_info = await Product.findById(
            new mongoose.Types.ObjectId(input.product_id)
        );
        product_info = product_info.toObject();

        product_info.return = 0;
        product_info.piece = 1;
        product_info.price =
            product_info.price *
            (product_info.currency === "TL"
                ? 1
                : product_info.currency === "DOLAR"
                ? dolar
                : product_info.currency === "EURO"
                ? euro
                : 0);
        product_info.price =
            product_info.price +
            (product_info.price * product_info.factor) / 100;
        order.total_price += product_info.price * product_info.piece;
    } else {
        const product = new Product({
            photos: [],
            brand: "",
            category_id: new mongoose.Types.ObjectId(
                "646a7d15ffb4ef83553f20b3"
            ),
            factor: 0,
            inventory: 100,
            name: input.name,
            price: 0,
            currency: "TL",
            status: false,
        });
        product_info = await product.save();
        product_info = product_info.toObject();
        product_info.piece = 1;
    }

    delete product_info.photos;
    delete product_info.__v;
    delete product_info.brand;
    delete product_info.category_id;
    delete product_info.description;
    delete product_info.factor;
    delete product_info.inventory;
    delete product_info.name;
    delete product_info.currency;
    delete product_info.status;

    order.products.push(product_info);

    try {
        const updated = await order.save();
        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const UpdateOrderAdmin = async (req, res, next) => {
    const { order_id } = req.params;
    const input = req.body;

    try {
        if (input.status === 2 || input.status === 4) {
            input.products.map(async (product) => {
                const oldProduct = await Product.findById(
                    new mongoose.Types.ObjectId(product._id)
                );
                if (!product.status) {
                    await Product.findByIdAndUpdate(product._id, {
                        status: true,
                        name: product.name,
                    });
                }
                if (oldProduct.price !== product.exact_price) {
                    await Product.findByIdAndUpdate(product._id, {
                        price: product.exact_price,
                    });
                }
                if (oldProduct.factor !== product.factor) {
                    await Product.findByIdAndUpdate(product._id, {
                        factor: product.factor,
                    });
                }
                if (oldProduct.currency !== product.currency) {
                    await Product.findByIdAndUpdate(product._id, {
                        currency: product.currency,
                    });
                }
            });
        }

        if (input.status === 6) {
            input.delivery_date = new Date();
        }

        const updated = await Order.findByIdAndUpdate(order_id, input, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const Update = async (req, res, next) => {
    //it needs to be edited.

    const { order_id } = req.params;
    const input = req.body;
    const old = await Order.findById(new mongoose.Types.ObjectId(order_id));

    if (old.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    }

    try {
        if (input.products) {
            input.total_price = 0;
            input.products = new mongoose.Types.Array(
                JSON.parse(input.products)
            );
            for (let i = 0; i < input.products.length; i++) {
                let product_info = await Product.findById(
                    new mongoose.Types.ObjectId(input.products[i].product_id)
                );
                input.products[i].price =
                    product_info.price +
                    (product_info.price * product_info.factor) / 100;

                old.products.forEach(async (product) => {
                    if (product.product_id == input.products[i].product_id) {
                        input.products[i].price = product.price;
                    }
                });

                input.total_price +=
                    input.products[i].price * input.products[i].piece;
            }
        }

        const updated = await Order.findByIdAndUpdate(order_id, input, {
            new: true,
        });

        res.json(updated);
    } catch (e) {
        next(e);
    }
};

const Delete = async (req, res, next) => {
    const { order_id } = req.params;

    const old = await Order.findById(new mongoose.Types.ObjectId(order_id));

    if (old.user_id != req.payload.user_id) {
        return next(Boom.badRequest("This order is not yours."));
    }

    try {
        const deleted = await Order.findByIdAndDelete(order_id);

        if (!deleted) {
            throw Boom.badRequest("Order not found.");
        }

        res.json(deleted);
    } catch (e) {
        next(e);
    }
};

const GetOrderPDF = async (req, res, next) => {
    try {
        const { order_id, offer } = req.params;

        if (!order_id) {
            return next(Boom.badRequest("Missing paramter (:order_id)"));
        }

        try {
            const order = await Order.aggregate()
                .match({
                    _id: new mongoose.Types.ObjectId(order_id),
                })
                .lookup({
                    from: "auths",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "client",
                })
                .unwind({
                    path: "$client",
                    preserveNullAndEmptyArrays: true,
                });

            if (
                req.payload.role !== "admin" &&
                order[0].user_id != req.payload.user_id
            ) {
                return next(Boom.badRequest("This order is not yours."));
            }

            for (let index = 0; index < order[0].products.length; index++) {
                let product_info = await Product.findById(
                    order[0].products[index]._id
                );
                order[0].products[index].name = product_info.name;
            }

            const payments = await Payments.find({ user_id: order[0].user_id });
            const orders = await Order.find({
                user_id: order[0].user_id,
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

            const result = totalOrders - totalPayments + order[0].total_price;

            let content = `
		<!DOCTYPE html>
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
					border-spacing: ;
					border-style: inset;
					border-color: gray;
					border-collapse: collapse;
					background-color:
				}
				#customerIDTable {
					border-width: 2px;
					border-spacing: ;
					border-style: inset;
					border-color: gray;
					border-collapse: collapse;
					background-color:
				}
				#customerIDTableTd {
					border-width: 2px;
					border-spacing: ;
					border-style: inset;
					border-color: gray;
					border-collapse: collapse;
					background-color:
				}
				#lineTable {
					border-width: 2px;
					border-spacing: ;
					border-style: inset;
					border-color: black;
					border-collapse: collapse;
					background-color: ;
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
					-moz-border-radius: ;
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
					-moz-border-radius: ;
				}
				#notesTable {
					border-width: 2px;
					border-spacing: ;
					border-style: inset;
					border-color: black;
					border-collapse: collapse;
					background-color:
				}
				#notesTableTd {
					border-width: 0px;
					border-spacing: ;
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
					background-color: ;
				}
				#mainbody td {
					border-color: gray;
				}
			</style>
			<title>Sipariş Fişi</title>
		</head>
		<body style="margin-left=0.6in; margin-right=0.6in; margin-top=0.79in; margin-bottom=0.79in" id="mainbody">
			<table cellpadding="0px" width="800" cellspacing="0px" border="0" style="border-color:blue; ">
				<tbody>
					<tr><td align="center" colspan="5"><h1>Sipariş Teklif Fişi</h1></td></tr>
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
														<td align="left" style="width:469px; ">${order[0].client.name}</td>
													</tr>
													<tr align="left">
														<td align="left" style="width:469px; ">Tel: &nbsp;${order[0].client.phone}</td>
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
										<td align="left"><span style="font-weight:bold; ">Teklif Tarihi:</span></td>
										<td align="left">${moment(
                                            order[0].delivery_date
                                                ? order[0].delivery_date
                                                : order[0].order_date
                                        ).format("DD.MM.YYYY HH:mm")}</td>
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
						<td align="center" style="width:3%" class="lineTableTd"><span style="font-weight:bold;">Sıra No</span>
						</td>
						<td align="center" style="width:20%" class="lineTableTd"><span style="font-weight:bold;">Mal
								Hizmet</span></td>
						<td align="center" style="width:7.4%" class="lineTableTd"><span style="font-weight:bold;">Miktar</span>
						</td>
						<td align="center" style="width:9%" class="lineTableTd"><span style="font-weight:bold;">Birim
								Fiyat</span></td>
						<td align="center" style="width:10.6%" class="lineTableTd"><span style="font-weight:bold;">Mal Hizmet
								Tutarı</span></td>
					</tr>`;
            let index = 1;
            for (const product of order[0].products) {
                content += `
			<tr class="lineTableTr">
			<td class="lineTableTd">${index}</td>
			<td class="lineTableTd">${product.name}</td>
			<td align="right" class="lineTableTd">${product.piece}</td>
			<td align="right" class="lineTableTd">${format(product.price.toFixed(2), {
                currency: "₺",
                decimalSeparator: ",",
                thousandSeparator: ".",
            })}</td>
			<td align="right" class="lineTableTd">${format(
                (product.piece * product.price).toFixed(2),
                {
                    currency: "₺",
                    decimalSeparator: ",",
                    thousandSeparator: ".",
                }
            )}</td>
		</tr>`;
                index++;
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
												style="font-weight:bold; ">Mal Hizmet Toplam Tutarı</span></td>
										<td align="right" style="width:81px; " class="lineTableBudgetTd">${format(
                                            order[0].total_price.toFixed(2),
                                            {
                                                currency: "₺",
                                                decimalSeparator: ",",
                                                thousandSeparator: ".",
                                            }
                                        )}</td>
									</tr>
								</tbody>
							</table>
						</td>
					</tr>
				</tbody>
			</table><br><br>`;

            if (offer !== "1") {
                content += `<table width="800px" table-layout="fixed" id="budgetContainerTable">
            <tbody>
                <tr>
                    <td valign="top" align="right">
                        <table>
                            <tbody>
                                <tr align="right">
                                    <td></td>
                                    <td width="200px" align="right" class="lineTableBudgetTd"><span
                                            style="font-weight:bold; ">Güncel Bakiyeniz</span></td>
                                    <td align="right" style="width:81px; " class="lineTableBudgetTd">${format(
                                        result.toFixed(2),
                                        {
                                            currency: "₺",
                                            decimalSeparator: ",",
                                            thousandSeparator: ".",
                                        }
                                    )}</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>`;
            }

            content += `<p>* RESMİ BELGE DEĞİLDİR</p>
        <p>* TEKLİF AMAÇLIDIR</p>
    </body>
    
    </html>
    `;

            const marginOptions = {
                top: "0.5in",
                right: "0.5in",
                bottom: "0.5in",
                left: "0.5in",
            };

            const browser = await puppeteer.launch({
                args: [
                    "--disable-setuid-sandbox",
                    "--no-sandbox",
                    "--single-process",
                    "--no-zygote",
                ],
                executablePath: process.env.NODE_ENV === 'production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
            });
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
    } catch (error) {
        console.error("Hata:", error);
        res.status(500).send("PDF oluşturma sırasında bir hata oluştu.");
    }
};

export default {
    Create,
    AdminCreate,
    Get,
    Return,
    AcceptOrRejectOffer,
    DeleteProduct,
    GetList,
    GetListAdmin,
    GetAdmin,
    UpdateOrderAdmin,
    AddProductToOrder,
    GetOrderPDF,
};
