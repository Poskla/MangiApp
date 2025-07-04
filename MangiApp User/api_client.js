const API_URL = "http://localhost:3000";


if (!localStorage.getItem("token")) {
  window.location.href = "login.html";
}


function getToken() {
  return localStorage.getItem("token");
}

async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: "Bearer " + getToken()
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Error de servidor");
  }
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken()
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Error de servidor");
  }
  return response.json();
}
