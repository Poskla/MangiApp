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

// Obtener todos los productos
app.get('/items', async (req, res) => {
  try {
    const [items] = await db.promise().query('SELECT * FROM Item');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

/* === SERVIDOR === */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Obtener pedidos
app.get('/orders/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        o.order_id,
        o.user_id,
        o.date,
        o.estado,
        o.subtotal,
        o.descuento,
        o.total,
        od.detail_id,
        od.cant,
        i.item_id,
        i.denominacion,
        i.precio,
        i.cat_id
      FROM Order o
      LEFT JOIN OrderDetail od ON o.order_id = od.order_id
      LEFT JOIN Item i ON od.item_id = i.item_id
      WHERE o.order_id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Extraer datos generales del pedido (vienen repetidos por el join)
    const pedidoData = {
      order_id: rows[0].order_id,
      user_id: rows[0].user_id,
      date: rows[0].date,
      estado: rows[0].estado,
      subtotal: rows[0].subtotal,
      descuento: rows[0].descuento,
      total: rows[0].total,
      mesa: rows[0].mesa,
      items: []
    };

    // Construir array de items sin duplicados
    rows.forEach(row => {
      if (row.detail_id) { // si tiene detalle
        pedidoData.items.push({
          detail_id: row.detail_id,
          cant: row.cant,
          item_id: row.item_id,
          denominacion: row.denominacion,
          precio: row.precio,
          cat_id: row.cat_id
        });
      }
    });

    res.json(pedidoData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar un nuevo pedido
app.post('/orders', async (req, res) => {
  try {
    const { mesa, descuento, estado, items } = req.body;

    // Calcular subtotal y total
    const subtotal = items.reduce((sum, i) => sum + (i.precio * i.cant), 0);
    const total = subtotal - (subtotal * descuento / 100);

    // Crear orden principal
    const [result] = await db.promise().query(
      `INSERT INTO order (user_id, date, estado, subtotal, descuento, total, mesa)
       VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
      [1, estado, subtotal, descuento, total, mesa]
    );

    const orderId = result.insertId;

    // Insertar detalles
    for (const item of items) {
      await db.promise().query(
        `INSERT INTO orderdetail (order_id, item_id, cant)
        VALUES (?, ?, ?)`,
        [result.insertId, item.item_id, item.cant]
      );
    }


    res.status(201).json({ message: 'Pedido guardado', order_id: orderId });
  } catch (err) {
    console.error('Error al guardar pedido:', err);  
    res.status(500).json({ error: 'Error al guardar pedido' });
  }
});
