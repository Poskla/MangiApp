const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
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

// Obtener todos los productos
app.get('/items', async (req, res) => {
  try {
    const [items] = await db.promise().query('SELECT * FROM Item');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un pedido específico
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
 
// PEDIDOS

// Cancelar un pedido (actualizar estado a "cancelado")
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

    // Insertar orden (tabla `order` con comillas invertidas)
    const [result] = await db.promise().query(
      `INSERT INTO \`order\` (user_id, date, estado, subtotal, descuento, total, mesa)
       VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
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

    // 1. Actualizar la tabla `order`
    await db.promise().query(
      'UPDATE \`order\` SET mesa = ?, descuento = ?, subtotal = ?, total = ? WHERE order_id = ?',
      [mesa, descuento, subtotal, total, orderId]
    );

    // 2. Eliminar los ítems anteriores
    await db.promise().query('DELETE FROM \`orderdetail\` WHERE order_id = ?', [orderId]);

    // 3. Insertar los nuevos ítems
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
    console.error('Error al obtener FAQs:', error); // 👈 esto es clave
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



app.post('/register', async (req, res) => {
  const { user, email, password, rol } = req.body;

  if (!user || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Hashear contraseña
    const hash = await bcrypt.hash(password, 10);

    // Insertar usuario
    await db.promise().query(
      'INSERT INTO `user` (`user`, `email`, `password`, `rol`) VALUES (?, ?, ?, ?)',
      [user, email, hash, rol || null]
    );

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    console.error('Error al registrar:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email o usuario ya está registrado' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

const jwt = require('jsonwebtoken');
const SECRET = '1234'; // Cámbiala por algo seguro

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Buscar por email
    const [rows] = await db.promise().query(
      'SELECT * FROM `user` WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email no encontrado' });
    }

    const usuario = rows[0];

    // Comparar contraseña
    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Crear token
    const token = jwt.sign(
      { user_id: usuario.user_id, user: usuario.user, rol: usuario.rol },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Login exitoso', token });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en login' });
  }
});




/* BOTON LLAMAR AL MOZO */ 
app.post('/llamar-mozo', (req, res) => {
  const { mesa } = req.body;
  const hora = new Date().toLocaleTimeString();

  io.emit('nueva-llamada', { mesa, hora }); // 🔥 ENVÍA EL EVENTO A LOS CLIENTES
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