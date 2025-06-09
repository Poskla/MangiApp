document.querySelector("form").addEventListener("submit", function(event) {
  event.preventDefault();  // Prevenimos que el formulario se envíe

  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;

  if (email && password) {
    alert("Login exitoso");
  } else {
    alert("Por favor, completa todos los campos");
  }
});

let categorias = [];
let platos = [];

document.addEventListener('DOMContentLoaded', async () => {
  categorias = await fetch('/api/categorias').then(res => res.json());
  platos = await fetch('/api/platos').then(res => res.json());

  document.getElementById('agregar-fila').addEventListener('click', agregarFila);
  document.getElementById('descuento').addEventListener('input', calcularTotales);
  document.getElementById('guardar-pedido').addEventListener('click', guardarPedido);

  agregarFila(); // inicia con una fila
});

function agregarFila() {
  const tbody = document.querySelector('#pedido-table tbody');
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td><input type="number" class="cantidad" value="1" min="1"></td>
    <td><select class="categoria"></select></td>
    <td><select class="plato"></select></td>
    <td class="precio">0</td>
    <td class="subtotal">0</td>
    <td><button class="eliminar">❌</button></td>
  `;

  tbody.appendChild(tr);

  const catSelect = tr.querySelector('.categoria');
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.cat_id;
    opt.textContent = c.denominacion;
    catSelect.appendChild(opt);
  });

  const cantidadInput = tr.querySelector('.cantidad');
  const platoSelect = tr.querySelector('.plato');

  catSelect.addEventListener('change', () => {
    actualizarPlatos(catSelect, platoSelect);
  });

  platoSelect.addEventListener('change', () => {
    actualizarPrecio(tr, platoSelect);
  });

  cantidadInput.addEventListener('input', () => calcularFila(tr));
  tr.querySelector('.eliminar').addEventListener('click', () => tr.remove());

  catSelect.dispatchEvent(new Event('change'));
}

function actualizarPlatos(catSelect, platoSelect) {
  const categoriaId = Number(catSelect.value);
  platoSelect.innerHTML = '';

  const platosFiltrados = platos.filter(p => p.cat_id === categoriaId);
  platosFiltrados.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.item_id;
    opt.textContent = p.denominacion;
    opt.dataset.precio = p.precio;
    platoSelect.appendChild(opt);
  });

  platoSelect.dispatchEvent(new Event('change'));
}

function actualizarPrecio(tr, platoSelect) {
  const selected = platoSelect.options[platoSelect.selectedIndex];
  const precio = parseFloat(selected.dataset.precio || 0);
  tr.querySelector('.precio').textContent = precio.toFixed(2);
  calcularFila(tr);
}

function calcularFila(tr) {
  const cantidad = parseFloat(tr.querySelector('.cantidad').value) || 0;
  const precio = parseFloat(tr.querySelector('.precio').textContent) || 0;
  const subtotal = cantidad * precio;
  tr.querySelector('.subtotal').textContent = subtotal.toFixed(2);
  calcularTotales();
}

function calcularTotales() {
  let subtotal = 0;
  document.querySelectorAll('.subtotal').forEach(el => {
    subtotal += parseFloat(el.textContent);
  });

  const descuento = parseFloat(document.getElementById('descuento').value) || 0;
  const total = subtotal - descuento;

  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('total').textContent = total.toFixed(2);
}

function guardarPedido() {
  const mesa = parseInt(document.getElementById('mesa').value);
  if (!mesa) {
    alert('Por favor, ingresá el número de mesa');
    return;
  }

  const items = [];
  document.querySelectorAll('#pedido-table tbody tr').forEach(tr => {
    const cantidad = parseFloat(tr.querySelector('.cantidad').value);
    const platoId = parseInt(tr.querySelector('.plato').value);
    const precio = parseFloat(tr.querySelector('.precio').textContent);

    if (cantidad && platoId) {
      items.push({ cantidad, platoId, precio });
    }
  });

  if (items.length === 0) {
    alert('Debe haber al menos un plato en el pedido.');
    return;
  }

  const descuento = parseFloat(document.getElementById('descuento').value) || 0;
  const subtotal = parseFloat(document.getElementById('subtotal').textContent) || 0;
  const total = subtotal - descuento;

  fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mesa, descuento, total, items })
  })
    .then(res => res.json())
    .then(data => {
      alert('Pedido guardado con ID: ' + data.id);
      location.reload();
    })
    .catch(err => {
      console.error('Error al guardar el pedido:', err);
      alert('Error al guardar el pedido.');
    });
}
