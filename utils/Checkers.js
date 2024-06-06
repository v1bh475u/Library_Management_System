const { runDBCommand } = require('./DBCommands.js');
const mysql = require('mysql2');
const statusChecker = (status) => {
    return status === 'pending' || status === 'approved' || status === 'disapproved' ? true : false;
}
const idchecker = async (id) => {
    const result = await runDBCommand(`SELECT * FROM requests WHERE id=${id}`);
    if (result.length > 0) {
        if (result[0].status === 'pending') {
            return true;
        }
    }
    return false;
}
const nameChecker = async (name) => {
    const result = await runDBCommand(`SELECT * FROM users WHERE username=${mysql.escape(name)}`);
    if (result.length > 0) {
        return true;
    }
    return false;
}
const checkin_check = async (req, res, next) => {
    const { bookId, borrower, title, date } = req.body;
    const isBook = await runDBCommand(`SELECT * FROM books WHERE id=${mysql.escape(bookId)} AND status='available' AND title=${mysql.escape(title)}`);
    const isUser = await runDBCommand(`SELECT * FROM users WHERE username=${mysql.escape(borrower)}`);
    const isBorrowed = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(bookId)} AND borrower=${mysql.escape(borrower)} AND borrowed_date<${mysql.escape(date)} AND returned_date IS NULL`);
    if (isBook.length > 0 && isUser.length > 0 && isBorrowed.length > 0) {
        next();
    } else {
        if (isBook.length === 0) {
            res.status(400).render('error', { message: "Wrong Book" });
        } else if (isUser.length === 0) {
            res.status(400).render('error', { message: "Unknown User" });
        } else if (isBorrowed.length > 0) {
            res.status(400).render('error', { message: "Not Allowed" });
        }
    }
}
const checkout_check = async (req, res, next) => {
    const { bookId, borrower, title, date } = req.body;
    const isBook = await runDBCommand(`SELECT * FROM books WHERE id=${mysql.escape(bookId)} AND status='available' AND title=${mysql.escape(title)}`);
    const isUser = await runDBCommand(`SELECT * FROM users WHERE username=${mysql.escape(borrower)}`);
    const isBorrowed = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(bookId)} AND borrower=${mysql.escape(borrower)} AND borrowed_date<${mysql.escape(date)} AND returned_date IS NULL`);
    if (isBook.length > 0 && isUser.length > 0 && isBorrowed.length === 0) {
        next();
    } else {
        if (isBook.length === 0) {
            res.status(400).render('error', { message: "Wrong Book" });
        } else if (isUser.length === 0) {
            res.status(400).render('error', { message: "Unknown User" });
        } else if (isBorrowed.length === 0) {
            res.status(400).render('error', { message: "Not Allowed" });
        }
    }
}
const messageChecker = async (user) => {
    const result = await runDBCommand(`SELECT * FROM requests WHERE username=${mysql.escape(user.username)} AND user_status='unseen'`);
    return result;
}

module.exports = { statusChecker, idchecker, nameChecker, messageChecker, checkin_check, checkout_check };