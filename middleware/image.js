import Boom from 'boom';
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Uploads is the Upload_folder_name
        cb(null, "images");
    },
    filename: function (req, file, cb) {
        console.log(req.payload.user_id);
        cb(null, file.fieldname + "-" + Date.now() + ".jpg");
    },
});


const maxSize = 1 * 1000 * 1000;

const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
        // Set the filetypes, it is optional
        var filetypes = /jpeg|jpg|png/;
        var mimetype = filetypes.test(file.mimetype);

        var extname = filetypes.test(
            path.extname(file.originalname).toLowerCase()
        );

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb(
            "Error: File upload only supports the " +
                "following filetypes - " +
                filetypes
        );
    },

    // mypic is the name of file attribute
});

export default uploadMiddleware;
