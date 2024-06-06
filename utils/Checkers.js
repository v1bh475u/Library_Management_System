const { error } = require('console');
const { runDBCommand } = require('./DBCommands.js');
const mysql = require('mysql2');
const e = require('express');
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
            res.status(400).render('error', { message: "Wrong Book", error: 'Book is not available' });
        } else if (isUser.length === 0) {
            res.status(400).render('error', { message: "Unknown User", error: 'User not found' });
        } else if (isBorrowed.length === 0) {
            res.status(400).render('error', { message: "Not Allowed", error: 'Book is not borrowed' });
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
            res.status(400).render('error', { message: "Wrong Book", error: 'Book is not available' });
        } else if (isUser.length === 0) {
            res.status(400).render('error', { message: "Unknown User", error: 'User not found' });
        } else if (isBorrowed.length > 0) {
            res.status(400).render('error', { message: "Not Allowed", error: 'Book is already borrowed' });
        }
    }
}
const messageChecker = async (user) => {
    const result = await runDBCommand(`SELECT * FROM requests WHERE username=${mysql.escape(user.username)} AND user_status='unseen'`);
    return result;
}
const BookChecker = async (req, res, next) => {
    const { title, author, genre, quantity } = req.body;
    if (!title) {
        res.render('error', { message: 'Wrong Book', error: 'Title is not present!' });
    }
    else if (!author) {
        res.render('error', { message: 'Wrong Book', error: 'Author is not present!' });
    }
    else if (!genre) {
        res.render('error', { message: 'Wrong Book', error: 'Genre is not present!' });
    }
    else if (quantity < 1) {
        res.render('error', { message: 'Wrong Book', error: 'Quantity is not present!' });
    } else {
        next();
    }
};

const isBookPresent = async (req, res, next) => {
    const title = req.body.title.trim();
    const author = req.body.author.trim();
    const genre = req.body.genre.trim();
    const result = await runDBCommand(`SELECT * FROM books WHERE title=${mysql.escape(title)} AND author=${mysql.escape(author)} AND genre=${mysql.escape(genre)}`);
    if (result.length > 0) {
        res.render('error', { message: 'Wrong Book', error: 'Book already present!' });
    } else {
        next();
    }
};

module.exports = { statusChecker, idchecker, nameChecker, messageChecker, checkin_check, checkout_check, BookChecker, isBookPresent };