
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
      items: items.filter(item => item.cat_id === cat.cat_id)
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
