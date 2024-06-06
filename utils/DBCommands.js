const dbConn = require('../config/database.js');
const mysql = require('mysql2');
const runDBCommand = (query) => {
    return new Promise((resolve, reject) => {
        dbConn.query(query, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        })
    })
};
const requestExe = async (request) => {
    let query, result;
    switch (request.request) {
        case 'checkout':
            query = `SELECT * FROM books WHERE id=${mysql.escape(request.book_id)} AND status='available'`;
            result = await runDBCommand(query);
            if (result[0].quantity === 1) {
                query = `UPDATE books SET status = 'Unavailable', quantity=quantity-1 WHERE id = ${mysql.escape(request.book_id)}`;
            } else {
                query = `UPDATE books SET quantity=quantity-1 WHERE id=${mysql.escape(request.book_id)}`;
            }
            result = await runDBCommand(query);
            query = `INSERT INTO borrowing_history (book_id,title,borrower,borrowed_date) VALUES(${mysql.escape(request.book_id)},${mysql.escape(request.title)},${mysql.escape(request.username)},${mysql.escape(request.date)})`;
            result = await runDBCommand(query);
            break;
        case 'checkin':
            query = `SELECT * FROM books WHERE id=${mysql.escape(request.book_id)}`;
            result = await runDBCommand(query);
            if (result[0].quantity === 0) {
                query = `UPDATE books SET status = 'available', quantity=quantity+1 WHERE id = ${mysql.escape(request.book_id)}`;
            } else {
                query = `UPDATE books SET quantity=quantity+1 WHERE id=${mysql.escape(request.book_id)}`;
            }
            result = await runDBCommand(query);
            query = `UPDATE borrowing_history SET returned_date=${mysql.escape(request.date)} WHERE book_id=${mysql.escape(request.book_id)} AND borrower=${mysql.escape(request.username)} AND returned_date IS NULL`;
            result = await runDBCommand(query);
            break;
        case 'adminPrivs':
            query = `UPDATE users SET role='admin' WHERE username=${mysql.escape(request.username)}`;
            result = await runDBCommand(query);
            break;
    }
};
module.exports = { runDBCommand, requestExe };