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
