import express from "express";
import cors from "cors";
import "dotenv/config";
import db from "./config/database.js";
import router from "./routes/index.js";
import Boom from "boom";

const app = express();

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use(router);

app.use((req, res, next) => {
    return next(Boom.notFound("This route does not exist."));
});

app.use((err, req, res, next) => {
    console.log(err);

    if (err) {
        if (err.output) {
            return res
                .status(err.output.statusCode || 500)
                .json(err.output.payload);
        }

        return res.status(500).json(err);
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("runing");
});
