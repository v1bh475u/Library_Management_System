function viewBookDetails(bookId) {
    window.location.href = `/books/${bookId}`;
}

function reqAdmin(username) {
    let date = new Date();
    fetch('/reqAdmin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            date: date.toISOString().slice(0, 19).replace('T', ' ')
        })
    })
    window.location.href = `/books`;
}