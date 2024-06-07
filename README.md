# Library Management System
This is a simple library management system that allows users to add, delete, and search for books in a library. The system is implemented in node.js,ejs and mysql.

## Setup
1. Clone the repository
2. Go to your sql command line and write the following:
```
source path/to/db.sql
```

Note: The path must be absolute path to the db.sql file present in the repository.
3. Go to the cloned repository and run the following command:
```
npm install
```
4. Add your mysql username and password in the .env file. You can change the port number in the .env file as well.
5. Run the following command to start the server:
```
npm start
```
6. Go to your browser and type the following in the address bar:
```
localhost:the_port_number_you_specified
```
## Features
A user can:
1. Request to checkin/checkout a book.
2. Request for admin privileges.
3. View his/her borrowing history.
4. Search for books.
5. View all books.

An admin can do all the above and:
1. Add a book.
2. View all the requests made by users.
3. Approve/Reject a user's request.

Feedback System: User gets notified when his/her request is approved/rejected.

## Security
- Passwords are hashed and salted before storing in the database.
- SQL injection is prevented by using prepared statements.
- JWT tokens are used for authentication.
- Authentication checks are in place for all routes.
