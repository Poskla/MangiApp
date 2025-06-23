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
app.use(express.urlencoded({extended:true}));
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


// app.get("/ABM_platos", (req, res) => res.render("ABM_platos"));

// app.get("/ABM_platos", async (req, res) => {
//     try {
//         const connection = await pool.getConnection();
//         const [rows] = await connection.query("SELECT * FROM item");
//         connection.release(); // Libera la conexión
//         res.render("ABM_platos", { platos: rows }); // Pasa los datos a la vista
//     } catch (error) {
//         console.error("Error al obtener los platos:", error);
//         res.status(500).send("Error al obtener los platos");
//     }
// });

app.get("/ABM_platos", async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Obtener los platos
        const [platos] = await connection.query(`
            SELECT 
                item.item_id, 
                item.denominacion, 
                item.precio, 
                category.denominacion as categoria_nombre
            FROM item
            JOIN category ON item.cat_id = category.cat_id
        `);
         const [categorias] = await connection.query("SELECT * FROM category");
        
        connection.release();
        res.render("ABM_platos", { 
            platos: platos,
            categorias: categorias  // Pasamos las categorías a la vista
        });
        
        connection.release();
        res.render("ABM_platos", { 
            platos: platos
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error al cargar los platos");
    }
});


app.post("/cargar", async function(req, res){
    console.log(req.body);
    const { nomb, precio, desc, cat } = req.body;
    
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            "INSERT INTO item (denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [nomb, desc, precio, 'NULL', 0, 1, cat]
        );
        
        // Obtener el nuevo plato creado con su categoría
        const [nuevoPlato] = await connection.query(`
            SELECT i.*, c.denominacion as categoria_nombre 
            FROM item i
            JOIN category c ON i.cat_id = c.cat_id
            WHERE i.item_id = ?
        `, [result.insertId]);
        
        connection.release();
        res.json({ success: true, plato: nuevoPlato[0] });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(500).json({ success: false });
    }
});

    // conexion.query(cargar, function(error){
    //     if(error){
    //         throw error;

    //     }else{
    //         console.log("Datos guardados !!!")
    //     }
    // })

    // console.log(datos);


 app.post("/actualizar-plato", async (req, res) => {
       console.log("Datos recibidos:", req.body); // Para depuración
       
       if (!req.body) {
           return res.status(400).json({ error: "Datos no recibidos" });
       }
       const { id, nombre, precio, descripcion, categoria } = req.body;
       
       try {
           const connection = await pool.getConnection();
           await connection.query(
               "UPDATE item SET denominacion = ?, precio = ?, descripcion = ?, cat_id = ? WHERE item_id = ?",
               [nombre, precio, descripcion, categoria, id]
           );
           connection.release();
           res.json({ success: true });
       } catch (error) {
           console.error("Error al actualizar:", error);
           res.status(500).json({ success: false, error: error.message });
       }
   });

app.delete("/borrar-plato/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        const connection = await pool.getConnection();
        await connection.query("DELETE FROM item WHERE item_id = ?", [id]);
        connection.release();
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error al borrar el plato:", error);
        res.status(500).json({ success: false });
    }
});




app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, function(){
    console.log("El servidor USER esta funcionando http://localhost:3000")
});
