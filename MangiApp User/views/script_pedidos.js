let pedidoId = null;

document.addEventListener('DOMContentLoaded', () => {
  const tablaBody = document.querySelector('#pedido-table tbody');
  const formContainer = document.getElementById('form-container');
  const formPedido = document.getElementById('form-pedido');
  const selectCategoria = document.getElementById('select-categoria');
  const selectItem = document.getElementById('select-plato');
  const inputCantidad = document.getElementById('input-cantidad');

  if (!formPedido) {
  console.error('No se encontró el formulario #form-pedido');
}

  document.getElementById('btn-index').addEventListener('click', () => {
    window.location.href = 'index';
  });
  document.getElementById('btn-pedidos').addEventListener('click', () => {
    window.location.href = 'lista_pedidos';
  });

  // Leer parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    pedidoId = params.get('order_id');
    const mesa = params.get('mesa');
    const inputMesa = document.getElementById('input-mesa');
    const valorMesaSpan = document.getElementById('valor-mesa');
    const descuentoInput = document.getElementById('descuento');
    
    // Mostrar en los spans
    document.getElementById('valor-pedido').textContent = pedidoId || '-';
    document.getElementById('valor-mesa').textContent = mesa || '-';

    if (pedidoId) {
      // Pedido existente: mostrar solo el span con la mesa
      valorMesaSpan.style.display = 'inline';
      inputMesa.style.display = 'none';
    } else {
      // Pedido nuevo: mostrar input para ingresar mesa
      valorMesaSpan.style.display = 'none';
      inputMesa.style.display = 'inline-block';
    }

  async function cargarDetallesPedido(pedidoId) {
  try {
    // Obtener solo detalles de ítems (como tu backend lo devuelve)
    const resDetalle = await fetch(`http://localhost:3000/orders/${pedidoId}`);
    const detalles = await resDetalle.json();

    // Obtener TODOS los pedidos para encontrar el descuento
    const resPedidos = await fetch('http://localhost:3000/orders');
    const pedidos = await resPedidos.json();

    // Buscar el pedido actual en la lista para obtener el descuento
    const pedido = pedidos.find(p => p.order_id == pedidoId);

    // Setear el descuento en el input si existe
    const descuentoInput = document.getElementById('descuento');
    if (descuentoInput && pedido && pedido.descuento != null) {
      descuentoInput.value = pedido.descuento;
    }

    // Limpiar la tabla
    const tablaBody = document.querySelector('#pedido-table tbody');
    tablaBody.innerHTML = '';

    // Cargar detalles de ítems en tabla
    detalles.forEach(det => {
      const subtotal = det.precio * det.cant;

      const tr = document.createElement('tr');
      tr.dataset.itemId = det.item_id;
      tr.dataset.cantidad = det.cant;
      tr.dataset.precio = det.precio;

      tr.innerHTML = `
        <td>${det.cant}</td>
        <td>${det.categoria}</td>
        <td>${det.denominacion}</td>
        <td>$${parseFloat(det.precio).toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
        <td><button class="btn btn-danger rounded-pill py-2 border border-dark fw-bold shadow fs-5 eliminar">Eliminar</button></td>
      `;

      tr.querySelector('.eliminar').addEventListener('click', () => {
        tr.remove();
        actualizarTotales();
      });

      tablaBody.appendChild(tr);
    });

    actualizarTotales();

  } catch (err) {
    console.error('Error al cargar detalles del pedido:', err);
    alert('No se pudieron cargar los ítems del pedido.');
    }
  }

  // Mostrar formulario directamente si hay datos cargados
  cargarDatos().then(() => {
    if (pedidoId) {
      cargarDetallesPedido(pedidoId);
    }
  });

  let categorias = [];
  let items = [];

  async function cargarDatos() {
    try {
      const resCat = await fetch('http://localhost:3000/categorias');
      categorias = await resCat.json();

      const resItems = await fetch('http://localhost:3000/items');
      items = await resItems.json();

      // Cargar categorías en el select
      selectCategoria.innerHTML = '<option value="">-- Selecciona categoría --</option>';
      categorias.forEach(c => {
        const option = document.createElement('option');
        option.value = c.cat_id;
        option.textContent = c.denominacion; // Nombre de la categoría
        selectCategoria.appendChild(option);
      });

      selectItem.innerHTML = '<option value="">-- Selecciona plato --</option>';
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('No se pudieron cargar categorías o platos.');
    }
  }

  // Cambiar platos según categoría
  selectCategoria.addEventListener('change', () => {
    const catId = selectCategoria.value;
    const itemsFiltrados = items.filter(item => item.cat_id == catId);

    selectItem.innerHTML = '<option value="">-- Selecciona plato --</option>';
    itemsFiltrados.forEach(item => {
      const precioNum = Number(item.precio);
      const precioFormateado = isNaN(precioNum) ? '0.00' : precioNum.toFixed(2);
      const option = document.createElement('option');
      option.value = item.item_id;
      option.textContent = `${item.denominacion} ($${precioFormateado})`;
      selectItem.appendChild(option);
    });
  });

  formContainer.style.display = 'block';

  // Manejar el envío del formulario
  formPedido.addEventListener('submit', (e) => {
    e.preventDefault();

    const cantidadNueva = parseInt(inputCantidad.value);
    const catId = selectCategoria.value;
    const itemId = selectItem.value;

    if (!cantidadNueva || !catId || !itemId) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const categoria = categorias.find(c => c.cat_id == catId);
    const item = items.find(i => i.item_id == itemId);
    const precioNum = Number(item.precio);

    // Buscar si ya hay fila con este item_id en la tabla
    const filas = Array.from(tablaBody.querySelectorAll('tr'));
    const filaExistente = filas.find(fila => fila.dataset.itemId === itemId);

    if (filaExistente) {
      // Actualizar cantidad y subtotal en la fila existente
      const tdCantidad = filaExistente.children[0];
      const tdSubtotal = filaExistente.children[4];

      const cantidadActual = parseInt(tdCantidad.textContent);
      const nuevaCantidad = cantidadActual + cantidadNueva;

      tdCantidad.textContent = nuevaCantidad;
      filaExistente.dataset.cantidad = nuevaCantidad;

      const nuevoSubtotal = precioNum * nuevaCantidad;
      tdSubtotal.textContent = `$${nuevoSubtotal.toFixed(2)}`;
    } else {
      // Agregar fila nueva
      const subtotal = precioNum * cantidadNueva;

      const tr = document.createElement('tr');
      tr.dataset.itemId = itemId;
      tr.dataset.cantidad = cantidadNueva;
      tr.dataset.precio = precioNum;

      tr.innerHTML = `
        <td>${cantidadNueva}</td>
        <td>${categoria.denominacion}</td>
        <td>${item.denominacion}</td>
        <td>$${precioNum.toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
        <td><button class="btn btn-danger rounded-pill py-2 border border-dark fw-bold shadow fs-5 eliminar">Eliminar</button></td>
      `;

      tablaBody.appendChild(tr);

      // Botón eliminar para fila nueva
      tr.querySelector('.eliminar').addEventListener('click', () => {
        tr.remove();
        actualizarTotales();
      });
    }

    actualizarTotales();
    formPedido.reset();
  });

  function actualizarTotales() {
    const filas = document.querySelectorAll('#pedido-table tbody tr');
    let total = 0;

    filas.forEach(fila => {
      const subtotal = parseFloat(fila.children[4].textContent.replace('$', ''));
      total += subtotal;
    });

    const descuentoInput = document.getElementById('descuento');
    const descuentoPct = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;

    const descuentoMonto = (total * descuentoPct) / 100;
    const totalFinal = total - descuentoMonto;

    document.getElementById('subtotal').textContent = total.toFixed(2);
    document.getElementById('total').textContent = totalFinal.toFixed(2);
  }

  // Listener para input descuento si existe
  if (descuentoInput) {
    descuentoInput.addEventListener('input', actualizarTotales);
  } else {
    console.warn('No se encontró el input con id "descuento"');
  }
});

document.getElementById('guardar-pedido').addEventListener('click', async () => {
    const inputMesa = document.getElementById('input-mesa');
    const valorMesa = document.getElementById('valor-mesa').textContent;
    const mesa = pedidoId
      ? parseInt(document.getElementById('valor-mesa').textContent)
      : parseInt(document.getElementById('input-mesa').value);

    if (!mesa || isNaN(mesa)) {
      alert('Ingresá un número de mesa válido');
      return;
    }

    // Obtener filas de productos
    const filas = Array.from(document.querySelectorAll('#pedido-table tbody tr'));
    if (filas.length === 0) {
      alert('El pedido no tiene productos');
      return;
    }

    // Armar items
    const items = filas.map(fila => ({
      item_id: parseInt(fila.dataset.itemId),
      cant: parseInt(fila.children[0].textContent),
      precio: parseFloat(fila.children[3].textContent.replace('$', ''))
    }));

    const descuento = parseFloat(document.getElementById('descuento').value) || 0;

    const pedido = {
      mesa: parseInt(mesa),
      descuento,
      estado: 'Pendiente',
      items
    };

    console.log('Pedido a enviar:', pedido);

    try {
        const url = pedidoId 
        ? `http://localhost:3000/orders/${pedidoId}`
        : `http://localhost:3000/orders`;
        const method = pedidoId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedido)
        });

      if (!res.ok) throw new Error('Error guardando pedido');

      alert('Pedido guardado correctamente');
      window.location.href = 'lista_pedidos.html';
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar el pedido');
    }
});