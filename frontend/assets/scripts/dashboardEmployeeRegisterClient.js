const ENDPOINT_REGISTRAR_CLIENTE = 'http://127.0.0.1:5000/cargar/tenant';
const ENDPOINT_TENANTS = 'http://127.0.0.1:5000/tenants';

const userRole = sessionStorage.getItem('userRole');
if (userRole !== 'employee') {
    window.location.href = '/views/index.html';
}

document.getElementById('formRegistrarUsuario').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('nuevoUsername').value;
    const email = document.getElementById('nuevoEmail').value;
    const password = document.getElementById('nuevoPassword').value;
    const first_name = document.getElementById('nuevoNombre').value;
    const last_name = document.getElementById('nuevoApellido').value;
    const dni = document.getElementById('nuevoDNI').value;
    const birth_date = document.getElementById('nuevoNacimiento').value;
    const phone = document.getElementById('nuevoTelefono').value;
    const mensaje = document.getElementById('mensajeRegistroUsuario');
    mensaje.textContent = '';
    fetch('http://127.0.0.1:5000/cargar/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, first_name, last_name, dni, birth_date, phone })
    })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(result => {
            if (result.ok) {
                mensaje.textContent = 'Usuario registrado con éxito';
                mensaje.style.color = 'green';
                document.getElementById('formRegistrarUsuario').reset();

                // Actualizar la lista de clientes
                fetch(ENDPOINT_TENANTS)
                    .then(response => response.json())
                    .then(data => {
                        renderClientes(data);
                    })
                    .catch(error => {
                        console.error('Error al cargar clientes:', error);
                    });

            } else {
                mensaje.textContent = result.data.error || 'Error al registrar usuario';
                mensaje.style.color = 'red';
            }
        })
        .catch(() => {
            mensaje.textContent = 'Error de conexión con el servidor';
            mensaje.style.color = 'red';
        });
});


function renderClientes(data) {
    const tabla = document.getElementById('tablaClientes');
    tabla.innerHTML = '';
    if (!data || data.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5">No hay clientes registrados.</td></tr>';
        return;
    }
    data.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${cliente.username}</td>
        <td>${cliente.email}</td>
        <td>${cliente.first_name || ''}</td>
        <td>${cliente.last_name || ''}</td>
        <td>${cliente.dni || ''}</td>
        <td>${cliente.phone || ''}</td>`;
        tabla.appendChild(tr);
    });
}

window.addEventListener('DOMContentLoaded', function () {
    fetch(ENDPOINT_TENANTS)
        .then(response => response.json())
        .then(data => {
            renderClientes(data);
        })
        .catch(error => {
            console.error('Error al cargar clientes:', error);
        });
});