const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const secretkey = process.env.SECRET_KEY;
const HashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const authenticateUser = (req, res, next) => {
    try {
        const token = req.headers.cookie.split('token=')[1];
        if (jwt.verify(token, secretkey)) {
            const exp = jwt.decode(token, secretkey).exp;
            if (Date.now() < exp * 1000) {
                next();
            } else {
                return res.render("error", { message: "Unauthorized", error: "Token expired! 💀" });
            }
        } else {
            return res.render("error", { message: "Unauthorized", error: "I see forgery!" });
        }
    }
    catch (err) {
        return res.render("error", { message: "Unauthorized", error: "Where's your token?" });
    }
};

const validateRequestBody = (req, res, next) => {
    if (req.body.username) {
        if (req.body.password) {
            next();
        } else {
            return res.status(400).send("Make sure you have entered the password! 😏");
        }
    } else {
        return res.status(400).send("Make sure you have entered the username! 😏");
    }
};

const isAdmin = async (req, res, next) => {
    const token = req.headers.cookie.split('token=')[1];
    if (jwt.decode(token, secretkey).role === 'admin') {
        next();
    } else {
        return res.status(401).send("How dare you try to access this page! 😡");
    }
};


const getUser = async (token) => {
    const username = jwt.decode(token, secretkey).username;
    const user = { username: username, role: jwt.decode(token, secretkey).role };
    return user;
};

module.exports = { authenticateUser, validateRequestBody, isAdmin, getUser, HashPassword };