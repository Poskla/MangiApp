const express = require("express");
const cors = require('cors');
const mysql = require("mysql2/promise");
const path = require('path');

const app = express();
const PORT = 3000;

// Configuración de la base de datos
const pool = mysql.createPool({
    host: "localhost",
    database: "mangiapp",
    user: "root",
    password: "123"
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Configuración de EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rutas principales
app.get("/", (req, res) => res.render("index"));
app.get("/index", (req, res) => res.render("index"));
app.get("/lista_pedidos", (req, res) => res.render("lista_pedidos"));
app.get("/edicion_pedido", (req, res) => res.render("edicion_pedido"));

// Ruta para ABM Platos
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
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error al cargar los platos");
    }
});

// Endpoint para cargar un nuevo plato
app.post("/cargar", async function(req, res) {
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

// Endpoint para actualizar un plato
app.post("/actualizar-plato", async (req, res) => {
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

app.post('/crear-categoria', async (req, res) => {
    const { nombre } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO category (denominacion) VALUES (?)', [nombre]);
        connection.release();
        res.json({ success: true });
    } catch (error) {
        console.error("Error al crear categoría:", error);
        res.status(500).json({ success: false });
    }
});

// Endpoint para borrar un plato
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

// Rutas para el segundo archivo
// Obtener todas las categorías
app.get('/categorias', async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM Category');
        res.json(categorias);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener todos los productos
app.get('/items', async (req, res) => {
    try {
        const [items] = await pool.query('SELECT * FROM Item');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener un producto específico
app.get('/item/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Item WHERE item_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Agregar nuevo producto
app.post('/items', async (req, res) => {
    const { denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id } = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO Item (denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id]
        );
        res.status(201).json({ id: result.insertId, message: 'Producto creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Modificar producto existente
app.put('/items/:id', async (req, res) => {
    const { denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id } = req.body;
    try {
        await pool.query(
            `UPDATE Item SET denominacion = ?, descripcion = ?, precio = ?, imagenURL = ?, disponible = ?, user_id = ?, cat_id = ?
            WHERE item_id = ?`,
            [denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id, req.params.id]
        );
        res.json({ message: 'Producto actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar producto
app.delete('/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Item WHERE item_id = ?', [req.params.id]);
        res.json({ message: 'Producto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener categorías con sus productos
app.get('/categorias-con-items', async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM Category');
        const [items] = await pool.query('SELECT * FROM Item');

        const result = categorias.map(cat => ({
            ...cat,
            items: items.filter(item => item.cat_id === cat.cat_id)
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PEDIDOS

// Cancelar un pedido (actualizar estado a "cancelado")
app.put('/orders/:id/cancel', async (req, res) => {
  try {
    await pool.query(
      'UPDATE \`order\` SET estado = ? WHERE order_id = ?',
      ['Cancelado', req.params.id]
    );
    res.json({ message: 'Pedido cancelado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cerrar un pedido (actualizar estado a "Cerrado")
app.put('/orders/:id/close', async (req, res) => {
  try {
    await pool.query(
      'UPDATE \`order\` SET estado = ? WHERE order_id = ?',
      ['Cerrado', req.params.id]
    );
    res.json({ message: 'Pedido cerrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los pedidos
app.get('/orders', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.order_id,
        o.mesa,
        o.descuento,
        CAST(o.total AS DECIMAL(8,2)) AS total,
        o.estado
      FROM \`order\` o
      ORDER BY o.date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener pedidos:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

// Obtener detalles de un pedido específico
app.get('/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await pool.query(`
      SELECT 
        od.cant, 
        i.item_id, 
        i.denominacion, 
        i.precio, 
        c.denominacion AS categoria
      FROM \`orderdetail\` od
      LEFT JOIN \`item\` i ON od.item_id = i.item_id
      LEFT JOIN \`category\` c ON i.cat_id = c.cat_id
      WHERE od.order_id = ?
    `, [orderId]);

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener detalles del pedido:', err.message);
    res.status(500).json({ error: 'Error al obtener detalles del pedido' });
  }
});

// Guardar un nuevo pedido
app.post('/orders', async (req, res) => {
  const { mesa, descuento = 0, estado = 'pendiente', items = [] } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe incluir items' });
  }

  try {
    const subtotal = items.reduce((sum, i) => sum + (i.precio * i.cant), 0);
    const total = subtotal - (subtotal * descuento / 100);

    // Insertar orden (tabla `order` con comillas invertidas)
    const [result] = await pool.query(
      `INSERT INTO \`order\` (user_id, date, estado, subtotal, descuento, total, mesa)
       VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
      [1, estado, subtotal, descuento, total, mesa]
    );

    const orderId = result.insertId;

    // Insertar detalles en orderdetail
    for (const item of items) {
      await pool.query(
        `INSERT INTO \`orderdetail\` (order_id, item_id, cant)
         VALUES (?, ?, ?)`,
        [orderId, item.item_id, item.cant]
      );
    }

    res.status(201).json({ message: 'Pedido guardado correctamente', order_id: orderId });

  } catch (err) {
    console.error('Error al guardar pedido:', err);
    res.status(500).json({ error: 'Error al guardar pedido' });
  }
});

// Actualizar pedido existente
app.put('/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const { mesa, descuento, estado, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe incluir items' });
  }

  try {
    // Calcular subtotal y total
    const subtotal = items.reduce((sum, i) => sum + (i.precio * i.cant), 0);
    const total = subtotal - (subtotal * descuento / 100);

    // 1. Actualizar la tabla `order`
    await pool.query(
      'UPDATE \`order\` SET mesa = ?, descuento = ?, subtotal = ?, total = ? WHERE order_id = ?',
      [mesa, descuento, subtotal, total, orderId]
    );

    // 2. Eliminar los ítems anteriores
    await pool.query('DELETE FROM \`orderdetail\` WHERE order_id = ?', [orderId]);

    // 3. Insertar los nuevos ítems
    for (const item of items) {
      await pool.query(
        'INSERT INTO \`orderdetail\` (order_id, item_id, cant) VALUES (?, ?, ?)',
        [orderId, item.item_id, item.cant]
      );
    }

    res.status(200).json({ message: 'Pedido actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar pedido:', err);
    res.status(500).json({ message: 'Error actualizando pedido' });
  }
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
