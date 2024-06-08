document.getElementById("login-btn").addEventListener("click", function () {
    const cookies = document.cookie.split(';').reduce((cookies, item) => {
        const [name, value] = item.split('=').map(part => part.trim());
        cookies[name] = value;
        return cookies;
    }, {});
    if (cookies.token) {
        return window.location.href = "/books";
    } else {
        return window.location.href = "/login";
    }
});

document.getElementById("register-btn").addEventListener("click", function () {
    window.location.href = "/register";
});