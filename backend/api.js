const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

//ENDPOINTS 

// Obtener todas las categorías
app.get('/categorias', async (req, res) => {
  try {
    const [categorias] = await db.promise().query('SELECT * FROM Category');
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar categoría existente
app.put('/categorias/:id', async (req, res) => {
  const { nombre } = req.body; // Obtener el nuevo nombre de la categoría
  const id = req.params.id; // Obtener el ID de la categoría a modificar
  try {
    const [result] = await db.promise().query(
      `UPDATE Category SET denominacion = ? WHERE cat_id = ?`,
      [nombre, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Eliminar categoría
app.delete('/categorias/:id', async (req, res) => {
  const id = req.params.id; // Obtener el ID de la categoría a eliminar
  try {
    const [result] = await db.promise().query('DELETE FROM Category WHERE cat_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener todos los productos
app.get('/items', async (req, res) => {
  try {
    const [items] = await db.promise().query('SELECT * FROM Item');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un producto específico
app.get('/item/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM Item WHERE item_id = ?', [req.params.id]);
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
    const [result] = await db.promise().query(
      `INSERT INTO Item (denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id]
    );
    res.status(201).json({ id: result.insertId, message: 'Producto creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar nueva categoría
app.post('/categorias', async (req, res) => {
  const { nombre } = req.body;
  try {
    const [result] = await db.promise().query(
      `INSERT INTO Category (denominacion) VALUES (?)`,
      [nombre]
    );
    res.status(201).json({ id: result.insertId, message: 'Categoría creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar producto existente
app.put('/items/:id', async (req, res) => {
  const { denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id } = req.body;
  try {
    await db.promise().query(
      `UPDATE Item SET denominacion = ?, descripcion = ?, precio = ?, imagenURL = ?, disponible = ?, user_id = ?, cat_id = ?
       WHERE item_id = ?`,
      [denominacion, descripcion, precio, imagenURL, disponible, user_id, cat_id, req.params.id]
    );
    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Eliminar producto
app.delete('/items/:id', async (req, res) => {
  try {
    await db.promise().query('DELETE FROM Item WHERE item_id = ?', [req.params.id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Obtener categorías con sus productos
app.get('/categorias-con-items', async (req, res) => {
  try {
    const [categorias] = await db.promise().query('SELECT * FROM Category');
    const [items] = await db.promise().query('SELECT * FROM Item');

    const result = categorias.map(cat => ({
      ...cat,
      items: items
      .filter(item => item.cat_id === cat.cat_id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
/* PEDIDOS */

// Cancelar un pedido (actualizar estado a "Cancelado")
app.put('/orders/:id/cancel', async (req, res) => {
  try {
    await db.promise().query(
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
    await db.promise().query(
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
    const [rows] = await db.promise().query(`
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

// Obtener resumen de ventas en un rango de fechas
app.get('/orders/summary', async (req, res) => {
  const { inicio, fin } = req.query;

  if (!inicio || !fin) {
    return res.status(400).json({ error: 'Se requiere rango de fechas (inicio y fin)' });
  }

  try {
    // Cantidad de pedidos y total
    const [pedidosResumen] = await db.promise().query(
      `SELECT COUNT(*) AS cantidad_pedidos, IFNULL(SUM(total),0) AS total_pedidos
       FROM \`order\`
       WHERE date BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND estado = 'Cerrado'`,
      [inicio, fin]
    );

    // Top 3 productos más pedidos 
    const [topProductos] = await db.promise().query(
      `SELECT i.denominacion, SUM(od.cant) AS cantidad
       FROM \`order\` o
       JOIN \`orderdetail\` od ON o.order_id = od.order_id
       JOIN \`item\` i ON od.item_id = i.item_id
       WHERE o.date BETWEEN ? AND ? AND o.estado = 'Cerrado'
       GROUP BY i.item_id
       ORDER BY cantidad DESC
       LIMIT 3`,
      [inicio, fin]
    );

    res.json({
      cantidad_pedidos: pedidosResumen[0].cantidad_pedidos,
      total_pedidos: pedidosResumen[0].total_pedidos,
      top_productos: topProductos
    });

  } catch (err) {
    console.error('Error al obtener resumen de ventas:', err);
    res.status(500).json({ error: 'Error al obtener resumen de ventas' });
  }
});

// Obtener detalles de un pedido específico
app.get('/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [rows] = await db.promise().query(`
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

    // Insertar orden en order
    const [result] = await db.promise().query(
      `INSERT INTO \`order\` (user_id, date, estado, subtotal, descuento, total, mesa)
       VALUES (?, curdate(), ?, ?, ?, ?, ?)`,
      [1, estado, subtotal, descuento, total, mesa]
    );

    const orderId = result.insertId;

    // Insertar detalles en orderdetail
    for (const item of items) {
      await db.promise().query(
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

    // Actualizar la tabla order
    await db.promise().query(
      'UPDATE \`order\` SET mesa = ?, descuento = ?, subtotal = ?, total = ? WHERE order_id = ?',
      [mesa, descuento, subtotal, total, orderId]
    );

    // Eliminar los ítems anteriores
    await db.promise().query('DELETE FROM \`orderdetail\` WHERE order_id = ?', [orderId]);

    // Insertar los nuevos ítems
    for (const item of items) {
      await db.promise().query(
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

/* PREGUNTAS FRECUENTES */

app.get('/faq', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM \`faqs\` ORDER BY faq_id');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener FAQs:', error); 
    res.status(500).json({ error: 'Error al obtener FAQs' });
  }
});

/* INFO DEL LOCAL */
app.get('/api/local', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query('SELECT * FROM local');
    if (rows.length === 0) return res.status(404).json({ error: 'Local no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener local:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* BOTON LLAMAR AL MOZO */ 
app.post('/llamar-mozo', (req, res) => {
  const { mesa } = req.body;
  const hora = new Date().toLocaleTimeString();

  io.emit('nueva-llamada', { mesa, hora }); 
  res.sendStatus(200);
});

/* === SOCKET.IO === */
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"], 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

/* === CONEXIÓN SOCKET.IO === */
io.on('connection', socket => {
  console.log('Cliente conectado por Socket.IO');

  socket.on('llamar-mozo', data => {
    console.log(`Mesa ${data.mesa} llamó al mozo a las ${data.hora}`);

    // Insertar en base de datos
    db.query(
      'INSERT INTO notificacion (mesa) VALUES (?)',
      [data.mesa],
      (err, result) => {
        if (err) {
          console.error('Error al guardar en la base:', err);
          return;
        }

        console.log('Llamado guardado en la base');
        io.emit('nueva-llamada', {
        mesa: data.mesa,
        hora: new Date().toLocaleTimeString()
        });
      }
    );
  });
});

/* === SERVIDOR === 
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); */

/* === SERVIDOR EXPRESS + SOCKET === */
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});