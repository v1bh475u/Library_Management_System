const DatePrettifier = async (date) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' };
    return date.toLocaleDateString('en-IN', options);
}
module.exports = { DatePrettifier };