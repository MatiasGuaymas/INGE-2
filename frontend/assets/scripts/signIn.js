const ENDPOINT_REGISTRAR_CLIENTE = 'http://127.0.0.1:5000/cargar/tenant';
const togglePassword = document.getElementById('toggleNuevoPassword');

togglePassword.addEventListener('click', function () {
    const passwordInput = document.getElementById('nuevoPassword');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<i class="bi bi-eye"></i>';
    }
});
document.addEventListener('DOMContentLoaded', function () {
    // Limitar fecha máxima de nacimiento a hoy
    const birthDateInput = document.getElementById('birthDateClient');
    if (birthDateInput) {
        const today = new Date().toISOString().split('T')[0];
        birthDateInput.max = today;
    }

    const form = document.getElementById('formRegisterClient');
    const mensaje = document.getElementById('messageRegisterClient');

    if (!form) return;

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        mensaje.textContent = '';
        mensaje.className = '';

        const data = {
            username: document.getElementById('nuevoUsername').value.trim(),
            password: document.getElementById('nuevoPassword').value,
            email: document.getElementById('nuevoEmail').value.trim(),
            last_name: document.getElementById('nuevoApellido').value.trim(),
            first_name: document.getElementById('nuevoNombre').value.trim(),
            dni: document.getElementById('nuevoDNI').value.trim(),
            birth_date: document.getElementById('nuevoNacimiento').value,
            phone: document.getElementById('nuevoTelefono').value.trim()
        };

        // Validación básica
        if (Object.values(data).some(v => !v)) {
            mensaje.textContent = 'Se deben ingresar todos los datos';
            mensaje.className = 'alert alert-danger';
            return;
        }

        try {
            const response = await fetch(ENDPOINT_REGISTRAR_CLIENTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const respData = await response.json();

            if (!response.ok) {
                mensaje.textContent = respData.error || 'Error al registrarse';
                mensaje.className = 'alert alert-danger';
                return;
            }

            mensaje.textContent = 'Usuario registrado con éxito';
            mensaje.className = 'alert alert-success';
            form.reset();

            // Guardar sesión del usuario recién creado
            sessionStorage.setItem('userLogged', 'true');
            sessionStorage.setItem('userRole', 'tenant');
            sessionStorage.setItem('username', data.username);

            // Redirigir a la landing page después de 2 segundos
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (error) {
            mensaje.textContent = 'Error al registrarse: ' + error.message;
            mensaje.className = 'alert alert-danger';
        }
    });
});