const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const dbConn = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DATABASE
});

dbConn.connect(function (err) {
    if (err) console.log(err);
    console.log('Ayye db is connected!');
});

module.exports = dbConn;