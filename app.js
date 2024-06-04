const express = require('express');
const dbConn = require('./config/database.js');
const mysql = require("mysql2");
var bodyParser = require('body-parser');
var path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
app.use(express.static('./public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const runDBCommand = (query) => {
    return new Promise((resolve, reject) => {
        dbConn.query(query, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        })
    })
}

async function HashPassword(password) {
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
            res.status(400).send("Password Problem");
        }
    } else {
        res.status(400).send("Username Problem");
    }
};

async function getUser(token) {
    const username = jwt.decode(token, secretkey).username;
    const user = { username: username, role: jwt.decode(token, secretkey).role };
    return user;
};

async function requestExe(request) {
    let query;
    switch (request.request) {
        case 'checkout':
            query = `UPDATE books SET status = 'checkedout', borrower=${mysql.escape(request.username)} WHERE id = ${mysql.escape(request.book_id)}`;
            await runDBCommand(query);
            query = `INSERT INTO borrowing_history (book_id,title,borrower,borrowed_date) VALUES(${mysql.escape(request.book_id)},${mysql.escape(request.title)},${mysql.escape(request.username)},${mysql.escape(request.date)})`;
            await runDBCommand(query);
            break;
        case 'checkin':
            query = `UPDATE books SET status = 'available', borrower=null WHERE id = ${mysql.escape(request.book_id)}`;
            await runDBCommand(query);
            query = `UPDATE borrowing_history SET returned_date=${mysql.escape(request.date)} WHERE book_id=${mysql.escape(request.book_id)} AND borrower=${mysql.escape(request.username)} AND returned_date IS NULL`;
            await runDBCommand(query);
            break;
        case 'admin':
            query = `UPDATE users SET role='admin' WHERE username=${mysql.escape(request.username)}`;
            await runDBCommand(query);
            break;
    }
};
app.get('/', (req, res) => {
    res.render('index');
});

app.use((req, res, next) => {
    console.log(req.method + " request_ for " + req.originalUrl);
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

app.get('/books', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM books`;
    const result = await runDBCommand(query);
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    res.render('BookCatalog', { books: result, user: user, genres: genres, authors: authors });
});

app.post('/books', authenticateUser, async (req, res) => {
    const genre = req.body.genre;
    const author = req.body.author;
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    console.log(genre, author);
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
    console.log(result);
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
    res.render('BookDetails', { book: result[0], user: user, history: history });
});

app.post('/checkout', async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.borrower;
    const title = req.body.title;
    const date = req.body.date;
    let query = `INSERT INTO requests (username,book_id,title,request,status,date) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkout','pending',${mysql.escape(date)})`;
    await runDBCommand(query);
    query = `UPDATE books SET status = 'Unavailable' WHERE id = ${mysql.escape(bookid)}`;
    await runDBCommand(query);
    console.log("Request Sent");
    res.redirect('/books');
});

app.post('/checkin', async (req, res) => {
    const bookid = req.body.bookId;
    const borrower = req.body.borrower;
    const title = req.body.title;
    const date = req.body.date;
    let query = `INSERT INTO requests (username,book_id,title,request,status,date) VALUES(${mysql.escape(borrower)},${mysql.escape(bookid)},${mysql.escape(title)},'checkin','pending',${mysql.escape(date)})`;
    await runDBCommand(query);
    query = `UPDATE books SET status = 'Unavailable' WHERE id = ${mysql.escape(bookid)}`;
    await runDBCommand(query);
    console.log("Request Sent");
    res.redirect('/books');
});

app.post('/reqAdmin', authenticateUser, async (req, res) => {
    const username = req.body.username;
    const query = `INSERT INTO requests (username,request,status) VALUES(${mysql.escape(username)},'admin','pending')`;
    await runDBCommand(query);
    console.log("Request Sent");
});

app.get('/history', authenticateUser, async (req, res) => {
    const token = req.headers.cookie.split('token=')[1];
    const user = await getUser(token);
    const query = `SELECT * FROM borrowing_history WHERE borrower = ${mysql.escape(user.username)}`;
    const result = await runDBCommand(query);
    res.render('BorrowingHistory', { borrowingHistory: result });
});

app.get('/requests', authenticateUser, async (req, res) => {
    const query = `SELECT * FROM requests`;
    const result = await runDBCommand(query);
    res.render('requests', { requests: result });
});

app.post('/apply-changes', async (req, res) => {
    for (let key in req.body.requests) {
        const query = `UPDATE requests SET status = ${mysql.escape(req.body.requests[key])} WHERE id = ${mysql.escape(key)}`;
        await runDBCommand(query);
        const request = await runDBCommand(`SELECT * FROM requests WHERE id = ${key}`);
        if (req.body.requests[key] === 'approved') {
            await requestExe(request[0]);
        } else if (req.body.requests[key] === 'disapproved') {
            const query = `UPDATE books SET status = 'available' WHERE id = ${mysql.escape(request[0].book_id)}`;
            await runDBCommand(query);
        }
    }
    res.redirect('/requests');
});