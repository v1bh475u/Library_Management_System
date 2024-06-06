const express = require('express');
const mysql = require("mysql2");
var bodyParser = require('body-parser');
var path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkers = require('./utils/Checkers.js')
const { runDBCommand, requestExe } = require('./utils/DBCommands.js');
const { authenticateUser, validateRequestBody, isAdmin, getUser, HashPassword } = require('./utils/Authenticate.js');
const port = process.env.PORT;
const secretkey = process.env.SECRET_KEY;
const app = express();

const genres = ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Biography', 'Autobiography', 'Self-Help', 'Cookbook', 'Travel', 'History', 'Science', 'Art', 'Poetry', 'Drama', 'Religion', 'Philosophy', 'Children', 'Young Adult', 'Comics', 'Graphic Novel', 'Manga', 'Textbook', 'Reference', 'Encyclopedia', 'Dictionary', 'Thesaurus', 'Atlas', 'Almanac', 'Periodical', 'Magazine', 'Newspaper', 'Journal', 'Newsletter', 'Brochure', 'Pamphlet', 'Flyer', 'Poster', 'Billboard', 'Banner', 'Postcard', 'Business Card', 'Letterhead', 'Envelope', 'Invoice', 'Memo', 'Agenda', 'Calendar', 'Planner', 'Diary', 'Journal', 'Notebook', 'Notepad', 'Sketchbook', 'Address Book', 'Contact List', 'Directory', 'Catalog', 'Manual', 'Guide', 'Handbook', 'Tutorial', 'Workbook', 'Textbook', 'Reference', 'Encyclopedia', 'Dictionary', 'Thesaurus', 'Atlas', 'Almanac', 'Periodical', 'Magazine', 'Newspaper', 'Journal', 'Newsletter', 'Brochure', 'Pamphlet', 'Flyer', 'Poster', 'Billboard', 'Banner', 'Postcard', 'Business Card', 'Letterhead', 'Envelope', 'Invoice', 'Memo', 'Agenda', 'Calendar', 'Planner', 'Diary', 'Journal', 'Notebook', 'Notepad', 'Sketchbook', 'Address Book', 'Contact List', 'Directory', 'Catalog', 'Manual', 'Guide', 'Handbook', 'Tutorial', 'Workbook'];
const authors = ['Agatha Christie', 'William Shakespeare', 'Arthur Conan Doyle'];
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index');
});

app.use((req, res, next) => {
    console.log(req.method + " request for " + req.originalUrl);
    next();
});

app.get('/login', (req, res) => {
    res.render('Login');
});

app.post('/login', validateRequestBody, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let query = `SELECT * FROM users WHERE username = ${mysql.escape(username)}`;
    let result = await runDBCommand(query);
    if (result.length === 0) {
        res.status(400).send("User Not Found");
        res.redirect('/login');
    }
    ;
    bcrypt.compare(password, result[0].password).then((isMatch) => {
        if (!isMatch) {
            res.status(400).send("Invalid Credentials");
            res.redirect('/login');
        }
        jwt.sign({ username: username, role: result[0].role }, secretkey, { expiresIn: '1d' }, (err, token) => {
            if (err) { res.status(500).send("Internal Server Error"); console.log(err); }
            res.set('Authorization', `Bearer ${token}`);
            res.cookie('token', token);
            res.redirect('/books');
        })
    }).catch((err) => {
        res.status(500).send("Internal Server Error");
        console.log(err);
    });

});

app.get('/register', (req, res) => {
    res.render('Register');
});

app.post('/register', validateRequestBody, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let query = `SELECT * FROM users WHERE username = ${mysql.escape(username)}`;
    const result = await runDBCommand(query);
    if (result.length > 0) {
        res.status(400).send("User Already Exists");
        res.redirect('/register');
    }
    const hashedPassword = await HashPassword(password);
    query = `INSERT INTO users (username,password,role) VALUES(${mysql.escape(username)},${mysql.escape(hashedPassword)},'user')`;
    await runDBCommand(query);
    res.redirect('/login');
});

app.get('/logout', authenticateUser, (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

app.get('/books', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books`;
    const result = await runDBCommand(query);
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const n_messages = await checkers.messageChecker(user);
    res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors, n_messages: n_messages.length });
});

app.post('/books', authenticateUser, async (req, res) => {
    const genre = req.body.genre;
    const author = req.body.author;
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    if (genre) {
        if (author) {
            const query = `SELECT * FROM books WHERE genre = ${mysql.escape(genre)} AND author = ${mysql.escape(author)}`;
            const result = await runDBCommand(query);
            res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });
        } else {
            const query = `SELECT * FROM books WHERE genre = ${mysql.escape(genre)}`;
            const result = await runDBCommand(query);
            res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });
        }
    } else if (author) {
        const query = `SELECT * FROM books WHERE author = ${mysql.escape(author)}`;
        const result = await runDBCommand(query);
        res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });
    } else {
        const query = `SELECT * FROM books`;
        const result = await runDBCommand(query);
        res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });

    }
});

app.post('/books/search', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books WHERE title LIKE '%${req.body.query}%'`;
    const result = await runDBCommand(query);
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });
});

app.get('/books/:id', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books WHERE id = ${mysql.escape(req.params.id)}`;
    const result = await runDBCommand(query);
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const history = await runDBCommand(`SELECT * FROM borrowing_history WHERE book_id=${mysql.escape(req.params.id)}`);
    const isBorrower = history.filter((h) => h.borrower === user.username && h.returned_date === null).length > 0;
    res.render('BookDetails', { book: result[0], user: user, history: history, isBorrower: isBorrower });
});

app.post('/checkout', authenticateUser, checkers.checkout_check, checkers.isAdminRequested, async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.borrower;
    const title = req.body.title;
    const date = req.body.date;
    let query = `INSERT INTO requests (username,book_id,title,request,status,date,user_status) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkout','pending',${mysql.escape(date)},'pending')`;
    await runDBCommand(query);
    console.log("Request Sent");
    res.redirect('/books');

});

app.post('/checkin', authenticateUser, checkers.checkin_check, checkers.isAdminRequested, async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.borrower;
    const title = req.body.title;
    const date = req.body.date;
    let query = `INSERT INTO requests (username,book_id,title,request,status,date,user_status) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkin','pending',${mysql.escape(date)},'pending')`;
    await runDBCommand(query);
    console.log("Request Sent");
    res.redirect('/books');

});

app.post('/reqAdmin', authenticateUser, checkers.isAdminRequested, async (req, res) => {
    const username = req.body.username;
    const date = req.body.date;
    if (!checkers.nameChecker(username)) {
        res.status(400).send("User Not Found 😛");
        return;
    }
    const query = `INSERT INTO requests (username,request,status,user_status,date) VALUES(${mysql.escape(username)},'adminPrivs','pending','pending',${mysql.escape(date)})`;
    await runDBCommand(query);
    console.log("Request Sent");
    res.render('error', { message: 'Request Sent', error: 'Request Sent' });
});

app.get('/history', authenticateUser, async (req, res) => {
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const query = `SELECT * FROM borrowing_history WHERE borrower = ${mysql.escape(user.username)}`;
    const result = await runDBCommand(query);
    res.render('BorrowingHistory', { borrowingHistory: result });
});

app.get('/requests', authenticateUser, isAdmin, async (req, res) => {
    const query = `SELECT * FROM requests`;
    const result = await runDBCommand(query);
    res.render('requests', { requests: result });
});

app.get('/add_book', authenticateUser, isAdmin, (req, res) => {
    res.render('AddBook');
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

app.get('/messages', authenticateUser, async (req, res) => {
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const query = `SELECT * FROM requests WHERE username=${mysql.escape(user.username)} AND user_status='unseen'`;
    const result = await runDBCommand(query);
    for (let i = 0; i < result.length; i++) {
        await runDBCommand(`UPDATE requests SET user_status='seen' WHERE id=${result[i].id}`);
    }
    res.render('messages', { messages: result });
});

app.post('/apply-changes', isAdmin, async (req, res) => {
    for (let key in req.body.requests) {
        if (!checkers.idchecker(key)) {
            res.status(400).send("Thought you could fool me, huh? 😏");
            return;
        }
        if (!checkers.statusChecker(req.body.requests[key])) {
            res.status(400).send("Try again! 😏 Oops! But you will fail!");
            return;
        }
        let query = `UPDATE requests SET status = ${mysql.escape(req.body.requests[key])} WHERE id = ${mysql.escape(key)}`;
        if (req.body.requests[key] !== 'pending') {
            query = `UPDATE requests SET status = ${mysql.escape(req.body.requests[key])}, user_status='unseen' WHERE id = ${mysql.escape(key)}`;
        }
        await runDBCommand(query);
        const request = await runDBCommand(`SELECT * FROM requests WHERE id = ${key}`);
        if (req.body.requests[key] === 'approved') {
            await requestExe(request[0]);
        }
    }
    res.redirect('/requests');
});