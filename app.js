const express = require('express');
const mysql = require("mysql2");
var bodyParser = require('body-parser');
var path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkers = require('./utils/Checkers.js')
const { DatePrettifier } = require('./utils/prettifier.js');
const { runDBCommand, requestExe, getgenres, getauthors } = require('./utils/DBCommands.js');
const { authenticateUser, validateRequestBody, isAdmin, getUser, HashPassword } = require('./utils/Authenticate.js');
const port = process.env.PORT;
const secretkey = process.env.SECRET_KEY;
const app = express();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    return res.render('index');
});

app.use((req, res, next) => {
    next();
});

app.get('/login', (req, res) => {
    return res.render('Login', { message: "" });
});

app.post('/login', validateRequestBody, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let query = `SELECT * FROM users WHERE username = ${mysql.escape(username)}`;
    let result = await runDBCommand(query);
    if (result.length === 0) {
        return res.render('Login', { message: "User not found" });
    }
    ;
    bcrypt.compare(password, result[0].password).then((isMatch) => {
        if (!isMatch) {
            return res.render('Login', { message: "Invalid Credentials" });
        }
        jwt.sign({ username: username, role: result[0].role }, secretkey, { expiresIn: '1d' }, (err, token) => {
            if (err) { res.status(500).send("Internal Server Error"); console.log(err); }
            res.set('Authorization', `Bearer ${token}`);
            res.cookie('token', token);
            return res.redirect('/books');
        })
    }).catch((err) => {
        res.status(500).send("Internal Server Error");
        console.log(err);
    });

});

app.get('/register', (req, res) => {
    return res.render('Register', { message: "" });
});

app.post('/register', validateRequestBody, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let query = `SELECT * FROM users WHERE username = ${mysql.escape(username)}`;
    const result = await runDBCommand(query);
    if (result.length > 0) {
        return res.render('Register', { message: "User already exists" });
    }
    const hashedPassword = await HashPassword(password);
    query = `INSERT INTO users (username,password,role) VALUES(${mysql.escape(username)},${mysql.escape(hashedPassword)},'user')`;
    await runDBCommand(query);
    res.redirect('/login');
});

app.get('/logout', authenticateUser, (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, path: '/' });
    res.redirect('/');
});

app.get('/books', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books`;
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    let books = await runDBCommand(query);
    books = await Promise.all((books).map(async (book) => {
        const user_status = await checkers.BookStatus(book, user);
        return { ...book, user_status };
    }));
    const n_messages = await checkers.messageChecker(user);
    const genres = await getgenres();
    const authors = await getauthors();
    return res.render('BookCatalog', { books: books, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: false });
});

app.post('/books', authenticateUser, async (req, res) => {
    const genre = req.body.genre;
    const author = req.body.author;
    const user_status = req.body.user_status;
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const n_messages = await checkers.messageChecker(user);
    const genres = await getgenres();
    const authors = await getauthors();
    if (genre) {
        if (author) {
            const query = `SELECT * FROM books WHERE genre = ${mysql.escape(genre)} AND author = ${mysql.escape(author)}`;
            let books = await runDBCommand(query);
            let result = books;
            if (user_status) {
                books = await Promise.all((books).map(async (book) => {
                    const user_status = await checkers.BookStatus(book, user);
                    return { ...book, user_status };
                }));
                result = books.filter((book) => book.user_status === user_status);
            }

            return res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: true });
        } else {
            const query = `SELECT * FROM books WHERE genre = ${mysql.escape(genre)}`;
            let books = await runDBCommand(query);
            let result = books;
            if (user_status) {
                books = await Promise.all((books).map(async (book) => {
                    const user_status = await checkers.BookStatus(book, user);
                    return { ...book, user_status };
                }));
                result = books.filter((book) => book.user_status === user_status);
            }
            return res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: true });
        }
    } else if (author) {
        const query = `SELECT * FROM books WHERE author = ${mysql.escape(author)}`;
        let books = await runDBCommand(query);
        if (user_status) {
            books = await Promise.all((books).map(async (book) => {
                const user_status = await checkers.BookStatus(book, user);
                return { ...book, user_status };
            }));
            books = books.filter((book) => book.user_status === user_status);
        }
        return res.render('BookCatalog', { books: books, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: true });
    } else if (user_status) {
        const query = `SELECT * FROM books`;
        let books = await runDBCommand(query);
        books = await Promise.all((books).map(async (book) => {
            const user_status = await checkers.BookStatus(book, user);
            return { ...book, user_status };
        }));
        const result = books.filter((book) => book.user_status === user_status);
        return res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: true });
    }
});

app.post('/books/search', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books WHERE title LIKE ${mysql.escape('%' + req.body.query + '%')}`;
    const result = await runDBCommand(query);
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const n_messages = await checkers.messageChecker(user);
    return res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors, n_messages: n_messages.length, back: true });
});

app.get('/books/:id', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books WHERE id = ${mysql.escape(req.params.id)}`;
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    let books = await runDBCommand(query);
    books = await Promise.all((books).map(async (book) => {
        const user_status = await checkers.BookStatus(book, user);
        return { ...book, user_status };
    }));
    let history = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(req.params.id)}`);
    for (let h of history) {
        h.borrowed_date = await DatePrettifier(h.borrowed_date);
        if (h.returned_date) {
            h.returned_date = await DatePrettifier(h.returned_date);
        }
    }
    const isBorrower = history.filter((h) => h.borrower === user.username && h.returned_date === null).length > 0;
    return res.render('BookDetails', { book: books[0], user: user, history: history, isBorrower: isBorrower, DatePrettifier });
});

app.post('/checkout', authenticateUser, checkers.checkout_check, checkers.isAdminRequested, async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.username;
    const title = req.body.title;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let query = `INSERT INTO requests (username,book_id,title,request,status,date,user_status) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkout','pending',${mysql.escape(date)},'pending')`;
    await runDBCommand(query);
    return res.render('error', { message: 'Request Sent', error: 'Request Sent' });

});

app.post('/checkin', authenticateUser, checkers.checkin_check, checkers.isAdminRequested, async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.username;
    const title = req.body.title;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let query = `INSERT INTO requests (username,book_id,title,request,status,date,user_status) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkin','pending',${mysql.escape(date)},'pending')`;
    await runDBCommand(query);
    return res.render('error', { message: 'Request Sent', error: 'Request Sent' });

});

app.post('/reqAdmin', authenticateUser, checkers.isAdminRequested, async (req, res) => {
    const username = req.body.username;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!checkers.nameChecker(username)) {
        res.status(400).send("User Not Found 😛");
        return;
    }
    const query = `INSERT INTO requests (username,request,status,user_status,date) VALUES(${mysql.escape(username)},'adminPrivs','pending','pending',${mysql.escape(date)})`;
    await runDBCommand(query);
    return res.render('error', { message: 'Request Sent', error: 'Request Sent' });
});

app.get('/history', authenticateUser, async (req, res) => {
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const query = `SELECT * FROM borrowing_history WHERE borrower = ${mysql.escape(user.username)}`;
    let result = await runDBCommand(query);
    for (let h of result) {
        h.borrowed_date = await DatePrettifier(h.borrowed_date);
        if (h.returned_date) {
            h.returned_date = await DatePrettifier(h.returned_date);
        }
    }
    return res.render('BorrowingHistory', { borrowingHistory: result, user: user });
});

app.get('/requests', authenticateUser, isAdmin, async (req, res) => {
    const query = `SELECT * FROM requests`;
    const result = await runDBCommand(query);
    return res.render('requests', { requests: result });
});

app.get('/add-remove_book', authenticateUser, isAdmin, async (req, res) => {
    const books = await runDBCommand(`SELECT * FROM books`);
    return res.render('Add-RemoveBook', { books: books });
});

app.post('/add_book', authenticateUser, isAdmin, checkers.BookChecker, checkers.isBookPresent, async (req, res) => {
    const title = req.body.title.trim();
    const author = req.body.author.trim();
    const genre = req.body.genre.trim();
    const quantity = req.body.quantity.trim();
    const query = `INSERT INTO books (title,author,genre,quantity,status) VALUES(${mysql.escape(title)},${mysql.escape(author)},${mysql.escape(genre)},${mysql.escape(quantity)},'available')`;
    await runDBCommand(query);
    res.redirect('/books');
});

app.post('/remove_book', authenticateUser, isAdmin, checkers.isBook, checkers.isPending, async (req, res) => {
    const title = req.body.title.trim();
    const quantity = req.body.quantity.trim();
    if (quantity < 0) {
        const query = `UPDATE books SET quantity=${mysql.escape('-1')} WHERE title=${mysql.escape(title)}`;
        await runDBCommand(query);
    } else {
        let result = await runDBCommand(`SELECT * FROM books WHERE title=${mysql.escape(title)}`);
        if (result[0].quantity < quantity) {
            return res.render('error', { message: 'Not Allowed', error: 'Quantity cannot be removed.' });
        }
        const query = `UPDATE books SET quantity=quantity-${mysql.escape(quantity)} WHERE title=${mysql.escape(title)}`;
        await runDBCommand(query);
        const check = await runDBCommand(`SELECT * FROM books WHERE title=${mysql.escape(title)}`);
        if (check[0].quantity === 0) {
            await runDBCommand(`UPDATE books SET status='Unavailable' WHERE title=${mysql.escape(title)}`);
        }
    }
    res.redirect('/books');
});

app.post('/update_book', authenticateUser, isAdmin, checkers.isBook, async (req, res) => {
    const title = req.body.title.trim();
    const quantity = req.body.quantity.trim();
    if (quantity < 0) {
        return res.render('error', { message: 'Not Allowed', error: 'Quantity cannot be negative!' });
    }
    const query = `UPDATE books SET quantity=quantity+${mysql.escape(quantity)} WHERE title=${mysql.escape(title)}`;
    await runDBCommand(query);
    const check = await runDBCommand(`SELECT * FROM books WHERE title=${mysql.escape(title)}`);
    res.redirect('/books');
});

app.get('/messages', authenticateUser, async (req, res) => {
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const query = `SELECT * FROM requests WHERE username=${mysql.escape(user.username)} AND user_status='unseen'`;
    const result = await runDBCommand(query);
    for (let i = 0; i < result.length; i++) {
        await runDBCommand(`UPDATE requests SET user_status='seen' WHERE id=${result[i].id}`);
    }
    return res.render('messages', { messages: result });
});

app.post('/apply-changes', isAdmin, async (req, res) => {
    for (let key in req.body) {
        if (!checkers.idchecker(key)) {
            res.status(400).render('error', { message: "Not Allowed", error: "Invalid Request" });
            return;
        }
        if (!checkers.statusChecker(req.body[key])) {
            res.status(400).render('error', { message: "Not Allowed", error: "Invalid Status" });
            return;
        }
        let query = `UPDATE requests SET status = ${mysql.escape(req.body[key])} WHERE id = ${mysql.escape(key)}`;
        if (req.body[key] !== 'pending') {
            query = `UPDATE requests SET status = ${mysql.escape(req.body[key])}, user_status='unseen' WHERE id = ${mysql.escape(key)}`;
        }
        await runDBCommand(query);
        const request = await runDBCommand(`SELECT * FROM requests WHERE id = ${key}`);
        if (req.body[key] === 'approved') {
            await requestExe(request[0]);
        }
    }
    res.redirect('/requests');
});