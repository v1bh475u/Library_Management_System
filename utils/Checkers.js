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
    const { bookId, username, title } = req.body;
    const isBook = await runDBCommand(`SELECT * FROM books WHERE id=${mysql.escape(bookId)} AND status='available' AND title=${mysql.escape(title)}`);
    const isUser = await runDBCommand(`SELECT * FROM users WHERE username=${mysql.escape(username)}`);
    const isBorrowed = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(bookId)} AND borrower=${mysql.escape(username)} AND returned_date IS NULL`);
    if (isBook.length > 0 && isUser.length > 0 && isBorrowed.length > 0) {
        next();
    } else {
        if (isBook.length === 0) {
            return res.status(400).render('error', { message: "Wrong Book", error: 'Book is not available' });
        } else if (isUser.length === 0) {
            return res.status(400).render('error', { message: "Unknown User", error: 'User not found' });
        } else if (isBorrowed.length === 0) {
            return res.status(400).render('error', { message: "Not Allowed", error: 'Book is not borrowed' });
        }
    }
}
const checkout_check = async (req, res, next) => {
    const { bookId, username, title } = req.body;
    const isBook = await runDBCommand(`SELECT * FROM books WHERE id=${mysql.escape(bookId)} AND status='available' AND title=${mysql.escape(title)}`);
    const isUser = await runDBCommand(`SELECT * FROM users WHERE username=${mysql.escape(username)}`);
    const isBorrowed = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(bookId)} AND borrower=${mysql.escape(username)} AND returned_date IS NULL`);
    if (isBook.length > 0 && isUser.length > 0 && isBorrowed.length === 0) {
        next();
    } else {
        if (isBook.length === 0) {
            return res.status(400).render('error', { message: "Wrong Book", error: 'Book is not available' });
        } else if (isUser.length === 0) {
            return res.status(400).render('error', { message: "Unknown User", error: 'User not found' });
        } else if (isBorrowed.length > 0) {
            return res.status(400).render('error', { message: "Not Allowed", error: 'Book is already borrowed' });
        }
    }
}
const messageChecker = async (user) => {
    const result = await runDBCommand(`SELECT * FROM requests WHERE username=${mysql.escape(user.username)} AND user_status='unseen'`);
    return result;
}
const BookChecker = async (req, res, next) => {
    const { title, author, genre, quantity } = req.body;
    const nquantity = parseInt(quantity);
    if (!title) {
        return res.render('error', { message: 'Wrong Book', error: 'Title is not present!' });
    }
    else if (!author) {
        return res.render('error', { message: 'Wrong Book', error: 'Author is not present!' });
    }
    else if (!genre) {
        return res.render('error', { message: 'Wrong Book', error: 'Genre is not present!' });
    }
    else if (nquantity === NaN) {
        return res.render('error', { message: 'Wrong Book', error: 'Quantity must be a number!' });
    } else if (nquantity < 0) {
        return res.render('error', { message: 'Wrong Book', error: 'Quantity must be a positive number!' });
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
        return res.render('error', { message: 'Wrong Book', error: 'Book already present!' });
    } else {
        next();
    }
};
const isBook = async (req, res, next) => {
    const title = req.body.title.trim();
    const result = await runDBCommand(`SELECT * FROM books WHERE title=${mysql.escape(title)}`);
    if (result.length > 0) {
        next();
    } else {
        return res.render('error', { message: 'Wrong Book', error: 'Book not present!' });
    }
};

const isAdminRequested = async (req, res, next) => {
    const username = req.body.username;
    const book_id = req.body.bookId;
    if (book_id === undefined) {
        const result = await runDBCommand(`SELECT * FROM requests WHERE username=${mysql.escape(username)} AND status='pending' AND request=${mysql.escape('adminPrivs')}`);
        if (result.length > 0) {
            res.clearCookie('token', { httpOnly: true, secure: true, path: '/' });
            return res.render('error', { message: 'SPAM', error: 'Request already present!' });
        } else {
            next();
        }
    } else {
        const result = await runDBCommand(`SELECT * FROM requests WHERE username=${mysql.escape(username)} AND book_id=${mysql.escape(book_id)} AND status='pending'`);
        if (result.length > 0) {
            res.clearCookie('token', { httpOnly: true, secure: true, path: '/' });
            return res.render('error', { message: 'SPAM', error: 'Request already present!' });
        } else {
            next();
        }
    }
}

const BookStatus = async function (book, user) {
    const isBorrowed = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(book.id)} AND borrower=${mysql.escape(user.username)} AND returned_date IS NULL`);
    if (isBorrowed.length > 0) {
        return 'borrowed';
    }
    const isRequested = await runDBCommand(`SELECT * FROM requests WHERE book_id=${mysql.escape(book.id)} AND username=${mysql.escape(user.username)} AND status='pending'`);
    if (isRequested.length > 0) {
        return 'requested';
    }
};
const isPending = async (req, res, next) => {
    const { title, quantity } = req.body;
    const result = await runDBCommand(`SELECT * FROM requests WHERE title=${mysql.escape(title)} AND status='pending'`);
    const nquantity = parseInt(quantity);
    const actual_quantity = parseInt((await runDBCommand(`SELECT quantity FROM books WHERE title=${mysql.escape(title)}`))[0].quantity);
    if (result.length > actual_quantity - nquantity) {
        return res.render('error', { message: 'Wrong Book', error: 'You have pending requests for the book!' });
    } else {
        next();
    }
};
module.exports = { statusChecker, idchecker, nameChecker, messageChecker, checkin_check, checkout_check, BookChecker, isBookPresent, isAdminRequested, isBook, BookStatus, isPending };