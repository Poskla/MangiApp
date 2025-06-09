document.addEventListener('DOMContentLoaded', () => {
  const tablaBody = document.querySelector('#pedido-table tbody');

  const formContainer = document.getElementById('form-container');
  const formPedido = document.getElementById('form-pedido');
  const selectCategoria = document.getElementById('select-categoria');
  const selectPlato = document.getElementById('select-plato');
  const inputCantidad = document.getElementById('input-cantidad');
  const btnCancelar = document.getElementById('btn-cancelar');

  // Leer parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const pedidoId = params.get('pedido_id');
  const mesa = params.get('mesa');

  // Mostrar en los spans
  document.getElementById('valor-pedido').textContent = pedidoId || '-';
  document.getElementById('valor-mesa').textContent = mesa || '-';

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
        option.textContent = c.name;
        selectCategoria.appendChild(option);
      });

      selectPlato.innerHTML = '<option value="">-- Selecciona plato --</option>';
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('No se pudieron cargar categorías o platos.');
    }
  }

  // Cambiar platos según categoría
  selectCategoria.addEventListener('change', () => {
    const catId = selectCategoria.value;
    const platosFiltrados = items.filter(item => item.cat_id == catId);

    selectPlato.innerHTML = '<option value="">-- Selecciona plato --</option>';
    platosFiltrados.forEach(plato => {
      const option = document.createElement('option');
      option.value = plato.item_id;
      option.textContent = `${plato.denominacion} ($${plato.precio.toFixed(2)})`;
      selectPlato.appendChild(option);
    });
  });

  // Mostrar formulario directamente si hay datos cargados
  cargarDatos();
  formContainer.style.display = 'block';

  // Cancelar formulario
  btnCancelar.addEventListener('click', () => {
    formPedido.reset();
    formContainer.style.display = 'none';
  });

  // Manejar el envío del formulario
  formPedido.addEventListener('submit', (e) => {
    e.preventDefault();

    const cantidad = parseInt(inputCantidad.value);
    const catId = selectCategoria.value;
    const platoId = selectPlato.value;

    if (!cantidad || !catId || !platoId) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const categoria = categorias.find(c => c.cat_id == catId);
    const plato = items.find(i => i.item_id == platoId);
    const subtotal = plato.precio * cantidad;

    // Agregar fila a la tabla
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cantidad}</td>
      <td>${categoria.name}</td>
      <td>${plato.denominacion}</td>
      <td>$${plato.precio.toFixed(2)}</td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="eliminar">❌</button></td>
    `;
    tablaBody.appendChild(tr);

    actualizarTotales();

    // Botón eliminar
    tr.querySelector('.eliminar').addEventListener('click', () => {
      tr.remove();
      actualizarTotales();
    });

    formPedido.reset();
    // formContainer.style.display = 'none'; // opcional si querés ocultarlo
  });

  function actualizarTotales() {
    const filas = document.querySelectorAll('#pedido-table tbody tr');
    let total = 0;

    filas.forEach(fila => {
      const subtotal = parseFloat(fila.children[4].textContent.replace('$', ''));
      total += subtotal;
    });

    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    const totalFinal = total - descuento;

    document.getElementById('subtotal').textContent = total.toFixed(2);
    document.getElementById('total').textContent = totalFinal.toFixed(2);
  }

  document.getElementById('descuento').addEventListener('input', actualizarTotales);
});
