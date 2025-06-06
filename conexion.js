let mysql = require("mysql");

let conexion = mysql.createConnection({
    host: "localhost",
    database: "mangiapp",
    user: "root",
    password: "123"
});

conexion.connect(function(err){
    if(err){
        throw err;
    }else{
        console.log("conectado");
    }
});
conexion.end();