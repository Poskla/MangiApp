const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../')));
app.use(express.json());

// Conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tu_clave', // Cambiá esto
  database: 'mangiapp'   // Nombre real de tu base
});

db.connect(err => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a MySQL');
});

// Obtener categorías
app.get('/api/categorias', (req, res) => {
  db.query('SELECT cat_id, denominacion FROM category', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Obtener platos
app.get('/api/platos', (req, res) => {
  db.query('SELECT item_id, denominacion, precio, cat_id FROM item WHERE disponible = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Guardar pedido
app.post('/api/pedidos', (req, res) => {
  const { mesa, descuento, total, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No hay productos en el pedido' });
  }

  const subtotal = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
  const estado = 'PENDIENTE';
  const user_id = 1; // Simulado, reemplazar por usuario real si corresponde

  const insertOrder = 'INSERT INTO `order` (user_id, estado, subtotal, `desc`, total) VALUES (?, ?, ?, ?, ?)';
  db.query(insertOrder, [user_id, estado, subtotal, descuento, total], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const orderId = result.insertId;
    const insertDetails = 'INSERT INTO orderdetail (order_id, item_id, cant) VALUES ?';
    const values = items.map(item => [orderId, item.platoId, item.cantidad]);

    db.query(insertDetails, [values], err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: orderId });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
