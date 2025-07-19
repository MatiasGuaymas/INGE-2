const ENDPOINT_VERIFICARUSUARIO = 'http://127.0.0.1:5000/verifyRole';
const formLogIn = document.getElementById('logInForm');
const errorMessage = document.getElementById('errorMessageLogIn');
const togglePassword = document.getElementById('toggleConfirmPassword');

togglePassword.addEventListener('click', function () {
    const passwordInput = document.getElementById('passwordLogIn');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<i class="bi bi-eye"></i>';
    }
});


formLogIn.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('usernameLogIn').value;
    const password = document.getElementById('passwordLogIn').value;
    if (!username || !password) {
        errorMessage.textContent = 'Por favor, completa todos los campos.';
        return;
    } else {
        errorMessage.textContent = ''; // Limpiar mensajes de error anteriores
    }
    const data = {
        username: username,
        password: password
    };
    fetch(ENDPOINT_VERIFICARUSUARIO, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(async response => {
            const respData = await response.json();
            if (!response.ok) {
                errorMessage.textContent = respData.error || 'Error al verificar el usuario';
                throw new Error(respData.message || 'Error al verificar el usuario');
            }
            errorMessage.textContent = '';
            return respData;
        })
        .then(data => {
            if (data.role === 'manager') {
                document.getElementById('managerCodeSection').style.display = 'block';
                const loginBtn = document.getElementById('botonLogIn');
                loginBtn.style.display = 'none';
                loginBtn.disabled = true; // Deshabilita el botón además de ocultarlo
                sessionStorage.setItem('pendingManagerCode', data.username);
                // Remueve el event listener del formulario para evitar reenvíos
                formLogIn.onsubmit = function (e) { e.preventDefault(); };
                // Iniciar temporizador para el botón de reenviar código
                iniciarTemporizadorReenvio();
            }
            else {
                console.log('Usuario verificado:', data);
                sessionStorage.setItem('userLogged', 'true');
                sessionStorage.setItem('userRole', data.role);
                sessionStorage.setItem('username', data.username);
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});

document.getElementById('verifyManagerCodeBtn').addEventListener('click', function () {
    const code = document.getElementById('managerCodeInput').value;
    const username = sessionStorage.getItem('pendingManagerCode');
    fetch('http://127.0.0.1:5000/verify-manager-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code })
    })
        .then(async response => {
            const respData = await response.json();
            if (!response.ok) {
                errorMessage.textContent = respData.error || 'Código incorrecto';
                throw new Error(respData.message || 'Código incorrecto');
            }
            // Si el código es correcto, loguear al manager
            sessionStorage.setItem('userLogged', 'true');
            sessionStorage.setItem('userRole', 'manager');
            sessionStorage.setItem('username', username);
            window.location.href = '/';
        })
        .catch(error => {
            errorMessage.textContent = error.message;
        });
});

// --- Lógica para el botón de reenviar código ---
let resendTimer = null;
function iniciarTemporizadorReenvio() {
    const resendBtn = document.getElementById('resendManagerCodeBtn');
    resendBtn.style.display = 'block';
    resendBtn.disabled = true;
    let segundos = 30;
    resendBtn.textContent = `Reenviar código (${segundos}s)`;
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = setInterval(() => {
        segundos--;
        resendBtn.textContent = `Reenviar código (${segundos}s)`;
        if (segundos <= 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Reenviar código';
        }
    }, 1000);
}

document.getElementById('resendManagerCodeBtn').addEventListener('click', function () {
    const username = sessionStorage.getItem('pendingManagerCode');
    const password = document.getElementById('passwordLogIn').value;
    // Llama al endpoint para reenviar el código
    fetch(ENDPOINT_VERIFICARUSUARIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(async response => {
            const respData = await response.json();
            if (!response.ok) {
                errorMessage.textContent = respData.error || 'Error al reenviar el código';
                throw new Error(respData.message || 'Error al reenviar el código');
            }
            errorMessage.textContent = 'Se ha reenviado un nuevo código a tu email.';
            iniciarTemporizadorReenvio();
        })
        .catch(error => {
            errorMessage.textContent = error.message;
        });
});