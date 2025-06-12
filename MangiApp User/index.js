const express = require("express")

const app = express();

let mysql = require("mysql");

let conexion = mysql.createConnection({
    host: "localhost",
    database: "mangiapp",
    user: "root",
    password: "123"
});

app.use(express.json());
app.use(express.urlencoded({extended:false}));
//const path = require('path');

//const path2 = require('path');
//const ruta = path.join(__dirname,'..','..','MangiApp User','public');

//const ruta2 = path2.join(__dirname,'..','..','MangiApp User','views');

app.set("view engine", "ejs");

app.get("/", function(req, res){
    res.render("ABM_platos")
});

app.post("/cargar", function(req,res){
    const datos = req.body;

    let nombre = datos.nomb;
    let precio = datos.precio;
    let descripcion = datos.desc;
    let categoria = datos.cat;

    let cargar = "INSERT INTO item (denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id) VALUES('"+nombre +"','"+descripcion +"',"+precio +",NULL, 0 , 1 ,"+categoria +")";

    conexion.query(cargar, function(error){
        if(error){
            throw error;

        }else{
            console.log("Datos guardados !!!")
        }
    })

    console.log(datos);
});

app.use(express.static("public"));

app.listen(3000, function(){
    console.log("El servidor USER esta funcionando http://localhost:3000")
});
