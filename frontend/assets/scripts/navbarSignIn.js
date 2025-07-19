window.addEventListener('DOMContentLoaded', function () {
    const userDropdown = document.getElementById('userDropdown');
    const loginBtn = document.getElementById('logInButton');
    const goToDashboard = document.getElementById('goToDashboard');
    const logoutBtn = document.getElementById('logoutBtn');
    const mensajeHola = document.getElementById('mensajeIngreso');
    const goToRentals = document.getElementById('goToRentals');
    const editProperty = document.getElementById('editProperty');

    // Chequea si el usuario está logueado
    if (sessionStorage.getItem('userLogged') === 'true') {
        // Muestra el dropdown y oculta el botón de login
        if (userDropdown) userDropdown.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if(goToRentals) goToRentals.style.display = 'none';
        if(editProperty) editProperty.style.display = 'none';

        // Muestra el mensaje de bienvenida
        if (mensajeHola) {
            const username = sessionStorage.getItem('username');
            mensajeHola.style.paddingTop = '14px';
            mensajeHola.style.fontWeight = 'bold';
            mensajeHola.textContent = `¡Hola, ${username || 'Usuario'}!`;
        }

        // Cambia el texto del botón de logout
        if (logoutBtn) logoutBtn.textContent = 'Cerrar Sesión';
        // Cambia el texto del dashboard
        if (goToDashboard) goToDashboard.textContent = 'Ir al Dashboard';
        // Redirección al dashboard según el rol
        if (goToDashboard) {
            goToDashboard.onclick = function (e) {
                e.preventDefault();
                const role = sessionStorage.getItem('userRole');
                if (role) {
                    window.location.href = `/views/dashboard${capitalizeFirstLetter(role)}.html`;
                }
            };
        }
        // Cerrar sesión
        if (logoutBtn) {
            logoutBtn.onclick = function (e) {
                e.preventDefault();
                sessionStorage.clear();
                window.location.href = '/views/index.html';
            };
        }
        if(this.sessionStorage.getItem('userRole') !== 'tenant') {
            if(goToRentals) goToRentals.style.display = 'block';
            if (goToRentals) {
                goToRentals.onclick = function (e) {
                    e.preventDefault();
                    window.location.href = '/views/rentals.html';
                };
            }

        if(this.sessionStorage.getItem('userRole') === 'manager') {
            if (editProperty) {
                editProperty.style.display = 'block';
                editProperty.onclick = function (e) {
                    e.preventDefault();
                    window.location.href = '/views/editProperty.html';
                };
            }
        }
    }
        
    } else {
        // Si no está logueado, muestra solo el botón de login
        if (userDropdown) userDropdown.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
    }

    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});