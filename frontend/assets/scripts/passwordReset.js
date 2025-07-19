const ENDPOINT_RESTABLECER_CONTRASENA = 'http://127.0.0.1:5000/reset_password';
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const form = document.getElementById('formRestablecerContrasena');
const togglePasswordVisibility = document.getElementById('toggleNewPassword');
const toggleConfirmPasswordVisibility = document.getElementById('toggleConfirmPassword');


togglePasswordVisibility.addEventListener('click', function () {
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput.type === 'password') {
        newPasswordInput.type = 'text';
        togglePasswordVisibility.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        newPasswordInput.type = 'password';
        togglePasswordVisibility.innerHTML = '<i class="bi bi-eye"></i>';
    }
});

toggleConfirmPasswordVisibility.addEventListener('click', function () {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        toggleConfirmPasswordVisibility.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        confirmPasswordInput.type = 'password';
        toggleConfirmPasswordVisibility.innerHTML = '<i class="bi bi-eye"></i>';
    }
});

form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const mensaje = document.getElementById('mensajeRestablecerContrasena');
    mensaje.textContent = '';
    mensaje.className = '';

    const password = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (!password || !confirmPassword) {
        mensaje.textContent = 'Por favor, completa todos los campos.';
        mensaje.className = 'alert alert-danger';
        return;
    }

    if (password !== confirmPassword) {
        mensaje.textContent = 'Las contraseñas no coinciden.';
        mensaje.className = 'alert alert-danger';
        return;
    }

    try {
        const response = await fetch(ENDPOINT_RESTABLECER_CONTRASENA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, new_password: password })
        });
        const respData = await response.json();
        if (!response.ok) {
            mensaje.textContent = respData.error || 'Error al restablecer la contraseña';
            mensaje.className = 'alert alert-danger';
            return;
        }
        mensaje.textContent = 'Contraseña restablecida con éxito. Puedes iniciar sesión ahora.';
        mensaje.className = 'alert alert-success';
        window.location.href = '/views/logIn.html';
    } catch (error) {
        mensaje.textContent = 'Error al restablecer la contraseña: ' + error.message;
        mensaje.className = 'alert alert-danger';
    }
});