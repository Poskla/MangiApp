const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123",
    database: "mangiapp"
    
});

module.exports = pool;