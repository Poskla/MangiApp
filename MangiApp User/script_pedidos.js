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
    window.location.href = 'index.html';
  });
  document.getElementById('btn-pedidos').addEventListener('click', () => {
    window.location.href = 'lista_pedidos.html';
  });

  const params = new URLSearchParams(window.location.search);
  pedidoId = params.get('order_id');
  const mesa = params.get('mesa');
  const inputMesa = document.getElementById('input-mesa');
  const valorMesaSpan = document.getElementById('valor-mesa');
  const descuentoInput = document.getElementById('descuento');

  document.getElementById('valor-pedido').textContent = pedidoId || '-';
  document.getElementById('valor-mesa').textContent = mesa || '-';

  if (pedidoId) {
    valorMesaSpan.style.display = 'inline';
    inputMesa.style.display = 'none';
  } else {
    valorMesaSpan.style.display = 'none';
    inputMesa.style.display = 'inline-block';
  }

  async function cargarDetallesPedido(pedidoId) {
    try {
      const resDetalle = await fetch(`http://localhost:3000/orders/${pedidoId}`);
      const detalles = await resDetalle.json();

      const resPedidos = await fetch('http://localhost:3000/orders');
      const pedidos = await resPedidos.json();

      const pedido = pedidos.find(p => p.order_id == pedidoId);
      if (descuentoInput && pedido && pedido.descuento != null) {
        descuentoInput.value = pedido.descuento;
      }

      tablaBody.innerHTML = '';

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
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los ítems del pedido.'
      });
    }
  }

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

      selectCategoria.innerHTML = '<option value="">-- Selecciona categoría --</option>';
      categorias.forEach(c => {
        const option = document.createElement('option');
        option.value = c.cat_id;
        option.textContent = c.denominacion;
        selectCategoria.appendChild(option);
      });

      selectItem.innerHTML = '<option value="">-- Selecciona plato --</option>';
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar categorías o platos.'
      });
    }
  }

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

  formPedido.addEventListener('submit', (e) => {
    e.preventDefault();

    const cantidadNueva = parseInt(inputCantidad.value);
    const catId = selectCategoria.value;
    const itemId = selectItem.value;

    if (!cantidadNueva || !catId || !itemId) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, completa todos los campos.'
      });
      return;
    }

    const categoria = categorias.find(c => c.cat_id == catId);
    const item = items.find(i => i.item_id == itemId);
    const precioNum = Number(item.precio);

    const filas = Array.from(tablaBody.querySelectorAll('tr'));
    const filaExistente = filas.find(fila => fila.dataset.itemId === itemId);

    if (filaExistente) {
      const tdCantidad = filaExistente.children[0];
      const tdSubtotal = filaExistente.children[4];

      const cantidadActual = parseInt(tdCantidad.textContent);
      const nuevaCantidad = cantidadActual + cantidadNueva;

      tdCantidad.textContent = nuevaCantidad;
      filaExistente.dataset.cantidad = nuevaCantidad;

      const nuevoSubtotal = precioNum * nuevaCantidad;
      tdSubtotal.textContent = `$${nuevoSubtotal.toFixed(2)}`;
    } else {
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

      tr.querySelector('.eliminar').addEventListener('click', () => {
        tr.remove();
        actualizarTotales();
      });

      tablaBody.appendChild(tr);
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

    const descuentoPct = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;
    const descuentoMonto = (total * descuentoPct) / 100;
    const totalFinal = total - descuentoMonto;

    document.getElementById('subtotal').textContent = total.toFixed(2);
    document.getElementById('total').textContent = totalFinal.toFixed(2);
  }

  if (descuentoInput) {
    descuentoInput.addEventListener('input', actualizarTotales);
  } else {
    console.warn('No se encontró el input con id "descuento"');
  }
});

document.getElementById('guardar-pedido').addEventListener('click', async () => {
  const mesa = pedidoId
    ? parseInt(document.getElementById('valor-mesa').textContent)
    : parseInt(document.getElementById('input-mesa').value);

  if (!mesa || isNaN(mesa)) {
    Swal.fire({
      icon: 'warning',
      title: 'Mesa inválida',
      text: 'Por favor, ingresa un número de mesa válido.'
    });
    return;
  }

  const filas = Array.from(document.querySelectorAll('#pedido-table tbody tr'));
  if (filas.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Pedido vacío',
      text: 'Agrega al menos un producto antes de guardar.'
    });
    return;
  }

  const items = filas.map(fila => ({
    item_id: parseInt(fila.dataset.itemId),
    cant: parseInt(fila.children[0].textContent),
    precio: parseFloat(fila.children[3].textContent.replace('$', ''))
  }));

  const descuento = parseFloat(document.getElementById('descuento').value) || 0;

  const pedido = {
    mesa,
    descuento,
    estado: 'Pendiente',
    items
  };

  Swal.fire({
    title: '¿Guardar pedido?',
    text: '¿Deseas guardar este pedido?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
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

        Swal.fire({
          icon: 'success',
          title: 'Pedido guardado',
          text: 'El pedido se guardó correctamente.'
        }).then(() => {
          window.location.href = 'lista_pedidos.html';
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al guardar el pedido.'
        });
      }
    }
  });
});
