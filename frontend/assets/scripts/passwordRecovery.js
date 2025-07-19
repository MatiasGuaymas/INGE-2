const ENDPOINT_ENVIAR_MAIL_RESET = 'http://127.0.0.1:5000/sendEmailPasswordReset';

form = document.getElementById('formRecuperarPassword');

form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const mensaje = document.getElementById('mensajeRecuperarPassword');
    mensaje.textContent = '';
    mensaje.className = '';

    const email = document.getElementById('email').value.trim();

    if (!email) {
        mensaje.textContent = 'Por favor, ingresa tu correo electrónico.';
        mensaje.className = 'alert alert-danger';
        return;
    }
    try {
        const response = await fetch(ENDPOINT_ENVIAR_MAIL_RESET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const respData = await response.json();
        if (!response.ok) {
            mensaje.textContent = respData.error || 'Error al enviar el correo de recuperación';
            mensaje.className = 'alert alert-danger';
            return;
        }
        mensaje.textContent = 'Correo de recuperación enviado con éxito. Revisa tu bandeja de entrada.';
        mensaje.className = 'alert alert-success';
        form.reset();
    } catch (error) {
        mensaje.textContent = 'Error al enviar el correo de recuperación: ' + error.message;
        mensaje.className = 'alert alert-danger';
    }
});