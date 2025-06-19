const express = require("express")

const app = express();

const mainRouter = require('./src/routes/main.router');
app.use(mainRouter);

app.use("ABM_platos", require('./src/routes/platos.router'));



let mysql = require("mysql2/promise");

let pool = mysql.createPool({
    host: "localhost",
    database: "mangiapp",
    user: "root",
    password: "123"
});

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({extended:false}));
const path = require('path');

//const path2 = require('path');
//const ruta = path.join(__dirname,'..','..','MangiApp User','public');

//const ruta2 = path2.join(__dirname,'..','..','MangiApp User','views');

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// app.get("/ABM_platos", function(req, res){
//     res.render("ABM_platos")
// });

app.get("/", (req, res) => res.render("index"));
app.get("/index", (req, res) => res.render("index"));
app.get("/ABM_platos", (req, res) => res.render("ABM_platos"));

app.post("/cargar",async function(req,res){
    const datos = req.body;

    let nombre = datos.nomb;
    let precio = datos.precio;
    let descripcion = datos.desc;
    let categoria = datos.cat;

    let cargar = "INSERT INTO item (denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id) VALUES('"+nombre +"','"+descripcion +"',"+precio +",NULL, 0 , 1 ,"+categoria +")";


     try {
           const connection = await pool.getConnection();
           await connection.query(cargar, [nombre, descripcion, precio, categoria]);
           console.log("Datos guardados !!!");
           res.status(200).send("Datos guardados !!!");
       } catch (error) {
           console.error("Error al guardar los datos:", error);
           res.status(500).send("Error al guardar los datos");
       }

    // conexion.query(cargar, function(error){
    //     if(error){
    //         throw error;

    //     }else{
    //         console.log("Datos guardados !!!")
    //     }
    // })

    // console.log(datos);
});



app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, function(){
    console.log("El servidor USER esta funcionando http://localhost:3000")
});
