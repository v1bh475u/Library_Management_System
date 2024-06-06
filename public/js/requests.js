let requests = {};
document.getElementById('apply-changes').addEventListener('click', function () {
    let status = document.querySelectorAll('.status');
    status.forEach(function (select) {
        const requestId = select.name;
        const newStatus = select.value;
        requests[requestId] = newStatus;
    });
    fetch('/apply-changes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            requests
        })
    })

    window.location.href = '/requests';
});