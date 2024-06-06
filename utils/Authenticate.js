const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const HashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const authenticateUser = (req, res, next) => {
    if (jwt.verify(req.headers.cookie.split('token=')[1], secretkey)) {
        next();
    } else {
        res.status(401).send("Unauthorized");
    }
};

const validateRequestBody = (req, res, next) => {
    if (req.body.username) {
        if (req.body.password) {
            next();
        } else {
            res.status(400).send("Make sure you have entered the password! 😏");
        }
    } else {
        res.status(400).send("Make sure you have entered the username! 😏");
    }
};

const isAdmin = async (req, res, next) => {
    const token = req.headers.cookie.split('token=')[1];
    if (jwt.decode(token, secretkey).role === 'admin') {
        next();
    } else {
        res.status(401).send("How dare you try to access this page! 😡");
    }
};


const getUser = async (token) => {
    const username = jwt.decode(token, secretkey).username;
    const user = { username: username, role: jwt.decode(token, secretkey).role };
    return user;
};

module.exports = { authenticateUser, validateRequestBody, isAdmin, getUser, HashPassword };