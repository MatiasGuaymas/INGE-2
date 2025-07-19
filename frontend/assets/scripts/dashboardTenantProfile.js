const ENDPOINT_USER_PROFILE = 'http://127.0.0.1:5000/user_profile';
const ENDPOINT_UPDATE_PROFILE = 'http://127.0.0.1:5000/update_profile';

// Verificar autenticación y cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', function () {
    const isLoggedIn = sessionStorage.getItem('userLogged') === 'true';
    const username = sessionStorage.getItem('username');

    if (!isLoggedIn || !username) {
        window.location.href = '/views/logIn.html';
        return;
    }

    // Cargar datos del usuario
    loadUserProfile(username);

    // NO inicializar el botón de contraseña aquí
    // setupPasswordToggle();

    // Configurar el evento saveChanges
    document.getElementById('saveChanges').addEventListener('click', saveChangesHandler);
});

// Función para cargar el perfil del usuario
async function loadUserProfile(username) {
    try {
        const response = await fetch(`${ENDPOINT_USER_PROFILE}?username=${username}`);

        if (!response.ok) {
            throw new Error('No se pudo cargar la información del perfil');
        }

        const userData = await response.json();
        displayUserData(userData);
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cargar la información del perfil'
        });
    }
}

// Función para mostrar los datos del usuario en la interfaz
function displayUserData(userData) {
    document.getElementById('currentUsername').textContent = userData.username;

    // Datos adicionales del tenant
    if (userData.first_name) document.getElementById('firstName').textContent = userData.first_name;
    if (userData.last_name) document.getElementById('lastName').textContent = userData.last_name;
    if (userData.phone) document.getElementById('userPhone').textContent = userData.phone;

    // Mostrar avatar con iniciales
    const avatarImg = document.getElementById('userAvatarImg');
    const nombre = userData.first_name || '';
    const apellido = userData.last_name || '';
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}+${encodeURIComponent(apellido)}&background=0D8ABC&color=fff&size=128`;
}

// Configurar visibilidad de contraseña (ahora se llamará cuando se abra el modal)
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword').querySelector('button');
    const passwordInput = document.getElementById('editValue');

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password'
                ? '<i class="bi bi-eye"></i>'
                : '<i class="bi bi-eye-slash"></i>';
        });
    }
}

// Mostrar modal de edición
function showEditModal(button) {
    const field = button.getAttribute('data-field');

    const modalElement = document.getElementById('editModal');

    const editField = document.getElementById('editField');
    const editValue = document.getElementById('editValue');
    const editLabel = document.getElementById('editLabel');
    const editHelp = document.getElementById('editHelp');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const currentPasswordGroup = document.getElementById('currentPasswordGroup');

    // Limpiar valores previos
    editValue.value = '';
    if (document.getElementById('currentPassword')) {
        document.getElementById('currentPassword').value = '';
    }

    // Ocultar grupo de contraseña actual por defecto
    if (currentPasswordGroup) {
        currentPasswordGroup.classList.add('d-none');
    }

    // Establecer campo a editar
    editField.value = field;

    // Configurar el modal según el campo
    switch (field) {
        case 'username':
            editLabel.textContent = 'Nuevo nombre de usuario';
            editHelp.textContent = 'Entre 3 y 50 caracteres, solo puede contener letras, números, punto y guion bajo';
            editValue.type = 'text';
            togglePasswordBtn.classList.add('d-none');
            break;

        case 'password':
            editLabel.textContent = 'Nueva contraseña';
            editHelp.textContent = 'Al menos 8 caracteres, una mayúscula y un caracter especial';
            editValue.type = 'password';
            togglePasswordBtn.classList.remove('d-none');
            setupPasswordToggle();
            // Mostrar campo de contraseña actual
            if (currentPasswordGroup) {
                currentPasswordGroup.classList.remove('d-none');
            }
            // Configurar toggle para contraseña actual
            setupCurrentPasswordToggle();
            break;

        case 'first_name':
            editLabel.textContent = 'Nuevo nombre';
            editHelp.textContent = 'Solo letras y espacios (máx. 50 caracteres)';
            editValue.type = 'text';
            togglePasswordBtn.classList.add('d-none');
            break;

        case 'last_name':
            editLabel.textContent = 'Nuevo apellido';
            editHelp.textContent = 'Solo letras y espacios (máx. 50 caracteres)';
            editValue.type = 'text';
            togglePasswordBtn.classList.add('d-none');
            break;

        case 'phone':
            editLabel.textContent = 'Nuevo teléfono';
            editHelp.textContent = 'Solo números, puede comenzar con + (entre 8 y 15 dígitos)';
            editValue.type = 'text';
            togglePasswordBtn.classList.add('d-none');
            break;
    }

    // Mostrar el modal usando jQuery (Bootstrap 4)
    $(modalElement).modal('show');
}

// Añadir función para toggle de contraseña actual
function setupCurrentPasswordToggle() {
    const toggleBtn = document.getElementById('toggleCurrentPassword');
    const passwordInput = document.getElementById('currentPassword');

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password'
                ? '<i class="bi bi-eye"></i>'
                : '<i class="bi bi-eye-slash"></i>';
        });
    }
}

// Función para manejar el guardado de cambios
async function saveChangesHandler() {
    const field = document.getElementById('editField').value;
    const value = document.getElementById('editValue').value.trim();
    const username = sessionStorage.getItem('username');

    if (!value) {
        Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Por favor, completa el campo'
        });
        return;
    }

    try {
        const requestData = {
            username: username,
            field: field,
            value: value
        };

        // Si es cambio de username, añadir el nuevo username
        if (field === 'username') {
            requestData.new_username = value;
        }

        // Si es cambio de contraseña, verificar contraseña actual
        if (field === 'password') {
            const currentPassword = document.getElementById('currentPassword').value;
            if (!currentPassword) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Campo vacío',
                    text: 'Por favor, ingresa tu contraseña actual'
                });
                return;
            }
            requestData.current_password = currentPassword;
        }

        const response = await fetch(ENDPOINT_UPDATE_PROFILE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('La contraseña actual es incorrecta');
            }
            throw new Error(result.error || 'Error al actualizar datos');
        }

        // Cerrar modal usando jQuery (Bootstrap 4)
        $('#editModal').modal('hide');

        // Mostrar mensaje de éxito
        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Datos actualizados con éxito'
        }).then(() => {
            // Si cambió el username, actualizar la sesión y recargar la página
            if (field === 'username' && result.new_username) {
                sessionStorage.setItem('username', result.new_username);
                window.location.reload();
                return;
            }
            // Recargar datos del perfil si no cambió el username
            loadUserProfile(sessionStorage.getItem('username'));
        });

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
}

// Función para actualizar el nombre de usuario en la navbar
function updateNavbarUsername(newUsername) {
    const navbarUser = document.getElementById('navbarUsername');
    if (navbarUser) {
        navbarUser.textContent = newUsername;
    }
}