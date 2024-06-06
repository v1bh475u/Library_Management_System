function checkoutBook(bookId, title, username) {
    let date = new Date();
    fetch('/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bookId: bookId,
            borrower: username,
            title: title,
            date: date.toISOString().slice(0, 19).replace('T', ' ')
        })
    })

    window.location.href = `/books`;
}

function checkinBook(bookId, title, username) {
    let date = new Date();
    fetch('/checkin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bookId: bookId,
            borrower: username,
            title: title,
            date: date.toISOString().slice(0, 19).replace('T', ' ')
        })
    })

    window.location.href = `/books`;
}