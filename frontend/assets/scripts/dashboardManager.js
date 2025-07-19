const ENDPOINT_CARGAREMPLEADO = 'http://127.0.0.1:5000/cargar/employee';
const ENDPOINT_CARGARGERENTE = 'http://127.0.0.1:5000/cargar/manager';
const ENDPOINT_EMPLOYEES = 'http://127.0.0.1:5000/employees';
const ENDPOINT_TENANTS = 'http://127.0.0.1:5000/tenants';
const ENDPOINT_CARGAR_PROPIEDAD = 'http://127.0.0.1:5000/cargar/property';
const ENDPOINT_DELETE_EMPLOYEE = 'http://127.0.0.1:5000/delete/employee';
const ENDPOINT_ESTADISTICAS_USUARIOS = `http://localhost:5000/statistics/new_users`;
const ENDPOINT_ESTADISTICAS_DINERO = `http://localhost:5000/statistics/money_deposited`;
const ENDPOINT_ESTADISTICAS_RENTAS = `http://localhost:5000/statistics/rentals`;

const formAddEmployee = document.getElementById('formAgregarEmpleado');
const errorMessage = document.getElementById('errorMessageAddEmployee');
const formAddProperty = document.getElementById('formAgregarPropiedad');
const errorMessageProperty = document.getElementById('errorMessageAddProperty');
const btnCancelarPropiedad = document.getElementById('btnCancelarPropiedad');

let newUsersChart = null;
let moneyChart = null;
let rentalChart = null;

// Chequeo de acceso: solo managers pueden ver este dashboard
const userRole = sessionStorage.getItem('userRole');
if (userRole !== 'manager') {
    window.location.href = '/views/index.html';
}

// Funciones para recargar listados
function loadEmpleados() {
    fetch(ENDPOINT_EMPLOYEES)
        .then(response => response.json())
        .then(data => {
            renderEmpleados(data);
        })
        .catch(error => {
            console.error('Error al cargar empleados:', error);
        });
}

function loadClientes() {
    fetch(ENDPOINT_TENANTS)
        .then(response => response.json())
        .then(data => {
            renderClientes(data);
        })
        .catch(error => {
            console.error('Error al cargar clientes:', error);
        });
}

function loadPropiedades() {
    fetch('http://127.0.0.1:5000/api/properties')
        .then(response => response.json())
        .then(data => {
            renderPropiedades(data);
        })
        .catch(error => {
            console.error('Error al cargar propiedades:', error);
        });
}

formAddEmployee.addEventListener('submit', function (event) {
    event.preventDefault();
    errorMessage.textContent = '';
    errorMessage.style.color = 'red';

    const username = document.getElementById('usernameDM').value;
    const password = document.getElementById('passwordDM').value;
    const email = document.getElementById('emailDM').value;
    let role = document.getElementById('isManager').checked ? 'manager' : 'employee';

    if (!username || !password || !email) {
        errorMessage.textContent = 'Por favor, completa todos los campos.';
        return;
    }
    errorMessage.textContent = '';
    const data = { username, password, email, role };
    if (role === 'manager') {
        fetch(ENDPOINT_CARGARGERENTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(async response => {
                const respData = await response.json();
                if (!response.ok) {
                    errorMessage.textContent = respData.error || 'Error al cargar el gerente';
                    errorMessage.style.color = 'red';
                    return errorMessage.textContent;
                }
                errorMessage.textContent = 'Usuario cargado con éxito';
                errorMessage.style.color = 'green';
                formAddEmployee.reset();
                loadEmpleados();
                return respData;
            })
            .then(data => {
                console.log('Gerente cargado:', data);
            });
    } else {
        fetch(ENDPOINT_CARGAREMPLEADO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(async response => {
                const respData = await response.json();
                if (!response.ok) {
                    errorMessage.textContent = respData.error || 'Error al cargar el empleado';
                    errorMessage.style.color = 'red';
                    return;
                }
                errorMessage.textContent = 'Usuario cargado con éxito';
                errorMessage.style.color = 'green';
                formAddEmployee.reset();
                loadEmpleados();
                return respData;
            })
            .then(data => {
                console.log('Empleado cargado:', data);
            });
    }
});

let isSubmittingProperty = false;
const mensajeAgregarPropiedad = document.getElementById('mensajeAgregarPropiedad');

// Nuevo código para manejar la carga de propiedades con imágenes
formAddProperty.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmittingProperty) return; // Evita doble submit

    isSubmittingProperty = true;
    mensajeAgregarPropiedad.textContent = '';
    mensajeAgregarPropiedad.className = '';

    // Crear FormData para enviar tanto datos como archivos
    const formData = new FormData();

    // Agregar los campos del formulario al FormData sin validación (la realiza el backend)
    formData.append('address', document.getElementById('address').value.trim());
    formData.append('address_number', document.getElementById('address_number').value.trim());
    formData.append('property_name', document.getElementById('property_name').value.trim());
    formData.append('price_per_night', document.getElementById('price_per_night').value.trim());
    formData.append('capacity', document.getElementById('capacity').value.trim());
    formData.append('floor', document.getElementById('floor').value.trim() || '0');
    formData.append('department', document.getElementById('department').value.trim() || 'N/A');
    formData.append('city', document.getElementById('city').value.trim());
    formData.append('province', document.getElementById('province').value.trim());
    formData.append('politica_de_cancelacion', document.getElementById('politica_de_cancelacion').value);

    // Agregar la foto sin validaciones
    const photoInput = document.getElementById('property_photo');
    if (photoInput && photoInput.files[0]) {
        formData.append('property_photo', photoInput.files[0]);
    }

    try {
        const response = await fetch(ENDPOINT_CARGAR_PROPIEDAD, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            mensajeAgregarPropiedad.textContent = result.message || 'Propiedad cargada con éxito';
            mensajeAgregarPropiedad.className = 'alert alert-success';
            formAddProperty.reset();
            document.getElementById('nombreArchivoAgregar').textContent = '';
            loadPropiedades();
        } else {
            mensajeAgregarPropiedad.textContent = result.error || 'Error al cargar la propiedad';
            mensajeAgregarPropiedad.className = 'alert alert-danger';
        }
    } catch (error) {
        console.error('Error:', error);
        mensajeAgregarPropiedad.textContent = 'Error al conectar con el servidor';
        mensajeAgregarPropiedad.className = 'alert alert-danger';
    } finally {
        isSubmittingProperty = false;
    }
});

// Manejar el botón de cancelar propiedad
if (btnCancelarPropiedad) {
    btnCancelarPropiedad.addEventListener('click', function () {
        formAddProperty.reset();
        mensajeAgregarPropiedad.textContent = '';
        mensajeAgregarPropiedad.className = '';
        document.getElementById('nombreArchivoAgregar').textContent = '';
    });
}

// Constante para el endpoint de edición de empleados
const ENDPOINT_EDIT_EMPLOYEE = 'http://127.0.0.1:5000/edit/employee';

// Manejo del formulario de edición de empleados
document.addEventListener('DOMContentLoaded', function() {
    const fieldToEdit = document.getElementById('fieldToEdit');
    const newValueContainer = document.getElementById('newValueContainer');
    const newValueInput = document.getElementById('newValue');
    const togglePasswordButton = document.getElementById('togglePassword');
    const formEditarEmpleado = document.getElementById('formEditarEmpleado');
    const errorMessageEditEmployee = document.getElementById('errorMessageEditEmployee');
    const successMessageEditEmployee = document.getElementById('successMessageEditEmployee');
    
    // Cambiar el tipo de input según el campo seleccionado
    if (fieldToEdit) {
        fieldToEdit.addEventListener('change', function() {
            const selectedField = this.value;
            
            // Mostrar el contenedor del nuevo valor
            newValueContainer.style.display = 'block';
            
            // Configurar el input según el tipo de campo
            if (selectedField === 'email') {
                newValueInput.type = 'email';
                newValueInput.placeholder = 'Nuevo correo electrónico';
                togglePasswordButton.style.display = 'none';
                
                // Ocultar select de roles si estaba visible
                if (document.getElementById('roleSelectContainer')) {
                    document.getElementById('roleSelectContainer').style.display = 'none';
                }
                newValueInput.style.display = 'block';
            } else if (selectedField === 'password') {
                newValueInput.type = 'password';
                newValueInput.placeholder = 'Nueva contraseña';
                togglePasswordButton.style.display = 'block';
                
                // Ocultar select de roles si estaba visible
                if (document.getElementById('roleSelectContainer')) {
                    document.getElementById('roleSelectContainer').style.display = 'none';
                }
                newValueInput.style.display = 'block';
            } else if (selectedField === 'username') {
                newValueInput.type = 'text';
                newValueInput.placeholder = 'Nuevo nombre de usuario';
                togglePasswordButton.style.display = 'none';
                
                // Ocultar select de roles si estaba visible
                if (document.getElementById('roleSelectContainer')) {
                    document.getElementById('roleSelectContainer').style.display = 'none';
                }
                newValueInput.style.display = 'block';
            } else if (selectedField === 'role') {
                // Si no existe, crear el container para el select de roles
                if (!document.getElementById('roleSelectContainer')) {
                    const roleSelectContainer = document.createElement('div');
                    roleSelectContainer.id = 'roleSelectContainer';
                    
                    const roleSelect = document.createElement('select');
                    roleSelect.id = 'roleSelect';
                    roleSelect.className = 'form-control';
                    
                    const managerOption = document.createElement('option');
                    managerOption.value = 'manager';
                    managerOption.textContent = 'Gerente';
                    
                    const employeeOption = document.createElement('option');
                    employeeOption.value = 'employee';
                    employeeOption.textContent = 'Empleado';
                    
                    roleSelect.appendChild(managerOption);
                    roleSelect.appendChild(employeeOption);
                    roleSelectContainer.appendChild(roleSelect);
                    
                    newValueContainer.appendChild(roleSelectContainer);
                } else {
                    document.getElementById('roleSelectContainer').style.display = 'block';
                }
                
                // Ocultar el input de texto regular
                newValueInput.style.display = 'none';
                togglePasswordButton.style.display = 'none';
            } else {
                newValueContainer.style.display = 'none';
                togglePasswordButton.style.display = 'none';
            }
        });
    }
    
    // Manejar el toggle de visibilidad de la contraseña
    if (togglePasswordButton) {
        togglePasswordButton.addEventListener('click', function() {
            const type = newValueInput.type === 'password' ? 'text' : 'password';
            newValueInput.type = type;
            
            // Cambiar el ícono según el estado
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            } else {
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            }
        });
    }
    
    // Manejar el envío del formulario
    if (formEditarEmpleado) {
        formEditarEmpleado.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            errorMessageEditEmployee.textContent = '';
            successMessageEditEmployee.textContent = '';
            
            const username = document.getElementById('usernameEdit').value.trim();
            const field = document.getElementById('fieldToEdit').value;
            let value;
            
            // Obtener el valor según el campo seleccionado
            if (field === 'role') {
                const roleSelect = document.getElementById('roleSelect');
                if (roleSelect) {
                    value = roleSelect.value;
                } else {
                    errorMessageEditEmployee.textContent = 'Error al obtener el rol seleccionado';
                    return;
                }
            } else {
                value = document.getElementById('newValue').value.trim();
            }
            
            const admin_username = sessionStorage.getItem('username');
            
            // Validaciones básicas
            if (!username) {
                errorMessageEditEmployee.textContent = 'Por favor, complete todos los campos';
                return;
            }
            
            if (!field) {
                errorMessageEditEmployee.textContent = 'Por favor, complete todos los campos';
                return;
            }
            
            if (!value) {
                errorMessageEditEmployee.textContent = 'Por favor, complete todos los campos';
                return;
            }
            
            // Mensaje de confirmación según el campo a editar
            let confirmMessage = `¿Deseas cambiar el ${field === 'username' ? 'nombre de usuario' : 
                                 field === 'email' ? 'correo electrónico' : 
                                 field === 'password' ? 'contraseña' :
                                 field === 'role' ? 'rol a ' + (value === 'manager' ? 'Gerente' : 'Empleado') : ''} de ${username}?`;
            
            // Confirmar antes de proceder
            const confirmResult = await Swal.fire({
                title: '¿Estás seguro?',
                text: confirmMessage,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar'
            });
            
            if (!confirmResult.isConfirmed) {
                return; // Operación cancelada
            }
            
            // Realizar la petición al servidor
            try {
                const requestData = { 
                    username, 
                    field, 
                    value,
                    admin_username
                };
                
                const response = await fetch(ENDPOINT_EDIT_EMPLOYEE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    errorMessageEditEmployee.textContent = data.error || 'Error al actualizar el empleado';
                    return;
                }
                
                // Éxito
                successMessageEditEmployee.textContent = data.message || 'Datos actualizados con éxito';
                formEditarEmpleado.reset();
                
                // Limpiar el contenedor de select de roles
                if (document.getElementById('roleSelectContainer')) {
                    document.getElementById('roleSelectContainer').style.display = 'none';
                }
                newValueContainer.style.display = 'none';

                // Actualizar la lista de empleados
                loadEmpleados();
                
            } catch (error) {
                console.error('Error:', error);
                errorMessageEditEmployee.textContent = 'Error de conexión con el servidor';
            }
        });
    }
});

function renderEmpleados(data) {
    const tabla = document.getElementById('tablaEmpleados');
    tabla.innerHTML = '';
    if (!data || data.length === 0) {
        tabla.innerHTML = '<tr><td colspan="3">No hay empleados registrados.</td></tr>';
        return;
    }
    data.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.username}</td>
            <td>${emp.email}</td>
            <td>${emp.role ? emp.role.charAt(0).toUpperCase() + emp.role.slice(1) : ''}</td>
        `;
        
        // Agregar evento de click en la fila para facilitar la edición
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', function() {
            document.getElementById('usernameEdit').value = emp.username;
            // Hacer scroll hasta el formulario de edición
            document.getElementById('formEditarEmpleado').scrollIntoView({behavior: 'smooth'});
        });
        
        tabla.appendChild(tr);
    });
}

// Reemplazar la función confirmarEliminarEmpleado
function confirmarEliminarEmpleado(username) {
    // Usar la instancia global Swal
    Swal.fire({
        title: '¿Estás seguro?',
        text: `¿Deseas dar de baja al usuario "${username}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarEmpleado(username);
        }
    });
}

// Modificar la función eliminarEmpleado para usar SweetAlert
async function eliminarEmpleado(username) {
    const admin_username = sessionStorage.getItem('username');

    try {
        const response = await fetch(ENDPOINT_DELETE_EMPLOYEE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, admin_username })
        });

        const data = await response.json();

        if (!response.ok) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error || 'Error al eliminar el empleado/gerente'
            });
            return;
        }

        Swal.fire({
            icon: 'success',
            title: '¡Completado!',
            text: data.message || 'Baja realizada con éxito'
        });

        // Actualizar listado de empleados
        loadEmpleados();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor'
        });
        console.error('Error:', error);
    }
}

// Modificación del formulario de eliminación
document.addEventListener('DOMContentLoaded', function () {
    const formEliminarEmpleado = document.getElementById('formEliminarEmpleado');
    if (formEliminarEmpleado) {
        formEliminarEmpleado.addEventListener('submit', async function (event) {
            event.preventDefault();
            const username = document.getElementById('usernameDelete').value.trim();

            if (!username) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Dato requerido',
                    text: 'Por favor, ingresa un nombre de usuario'
                });
                return;
            }

            try {
                // Verificar primero si el usuario existe y es un empleado/gerente activo
                const response = await fetch(`http://127.0.0.1:5000/check_employee_exists?username=${encodeURIComponent(username)}`);
                const data = await response.json();

                if (response.ok && data.exists) {
                    // Solo si el usuario existe y es un empleado/gerente activo, mostrar confirmación
                    confirmarEliminarEmpleado(username);
                } else {
                    // Si el usuario no existe, está inactivo o no es un empleado/gerente
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.error || 'Error al verificar el usuario'
                    });
                }
            } catch (error) {
                console.error('Error al verificar usuario:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de conexión',
                    text: 'No se pudo conectar con el servidor'
                });
            }
        });
    }
});

function renderPropiedades(data) {
    console.log('Datos de propiedades:', data);
    const tabla = document.getElementById('tablaPropiedades');
    tabla.innerHTML = '';
    if (!data || !data.properties || data.properties.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5">No hay propiedades registradas.</td></tr>';
        return;
    }
    data.properties.forEach(prop => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${prop.address}</td>
            <td>${prop.address_number}</td>
            <td>${prop.city}</td>
            <td>${prop.province}</td>
        `;
        tabla.appendChild(tr);
    });
}

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
                loadClientes();
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

fetch('https://apis.datos.gob.ar/georef/api/provincias')
    .then(response => response.json())
    .then(data => {
        const select = document.getElementById('province');
        data.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));
        data.provincias.forEach(prov => {
            const option = document.createElement('option');
            option.value = prov.nombre;
            option.textContent = prov.nombre;
            select.appendChild(option);
        });
    })
    .catch(err => console.error('Error cargando provincias:', err));

document.getElementById('province').addEventListener('change', function () {
    const provinciaSeleccionada = this.value;
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option disabled selected>Cargando...</option>';

    fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinciaSeleccionada)}&max=500`)
        .then(response => response.json())
        .then(data => {
            citySelect.innerHTML = '<option value="" disabled selected>Seleccione una ciudad</option>';
            data.localidades.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.localidades.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.nombre;
                option.textContent = loc.nombre;
                citySelect.appendChild(option);
            });
        })
        .catch(err => {
            citySelect.innerHTML = '<option disabled selected>Error al cargar</option>';
            console.error('Error cargando localidades:', err);
        });
});

window.addEventListener('DOMContentLoaded', function () {
    loadEmpleados();
    loadClientes();
    loadPropiedades();
});

// Eliminación fisica - Comentar esta sección antes de la demo

// Endpoint para eliminación permanente
const ENDPOINT_PERMANENT_DELETE = 'http://127.0.0.1:5000/permanent_delete/employee';

// Funcionalidad de eliminación permanente
document.addEventListener('DOMContentLoaded', function () {
    const formEliminarPermanente = document.getElementById('formEliminarPermanente');
    if (formEliminarPermanente) {
        formEliminarPermanente.addEventListener('submit', async function (e) {
            e.preventDefault();
            const username = document.getElementById('usernamePermDelete').value.trim();

            if (!username) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Campo requerido',
                    text: 'Por favor, ingresa un nombre de usuario'
                });
                return;
            }

            // Confirmar eliminación permanente
            Swal.fire({
                title: '¡PELIGRO!',
                html: `Estás a punto de <strong>ELIMINAR PERMANENTEMENTE</strong> al usuario "${username}".<br><br>
                       Esta acción NO PUEDE DESHACERSE.<br><br>
                       ¿Estás absolutamente seguro?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar permanentemente',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const admin_username = sessionStorage.getItem('username');

                    try {
                        const response = await fetch(ENDPOINT_PERMANENT_DELETE, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, admin_username })
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: data.error || 'Error al eliminar permanentemente'
                            });
                            return;
                        }

                        Swal.fire({
                            icon: 'success',
                            title: 'Eliminación Completa',
                            text: data.message || 'Usuario eliminado permanentemente'
                        });

                        // Actualizar listados
                        loadEmpleados();
                        document.getElementById('usernamePermDelete').value = '';

                    } catch (error) {
                        console.error('Error:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error de conexión',
                            text: 'No se pudo conectar con el servidor'
                        });
                    }
                }
            });
        });
    }
});


function inicializarDatepickers(idFechaInicial, idFechaFinal) {
    const inputInicio = document.getElementById(idFechaInicial);
    const inputFin = document.getElementById(idFechaFinal);

    // Obtener la fecha actual en formato YYYY-MM-DD
    const hoy = new Date();
    const formatoHoy = hoy.toISOString().split('T')[0];
    
    // Establecer fecha máxima como el día actual
    inputInicio.max = formatoHoy;
    inputFin.max = formatoHoy;

    if (!inputInicio || !inputFin) {
        console.error('Uno o ambos IDs no son válidos.');
        return;
    }

    inputInicio.addEventListener('change', () => {
        const fechaInicio = inputInicio.value;
        inputFin.min = fechaInicio;
        if (inputFin.value && inputFin.value < fechaInicio) {
            inputFin.value = fechaInicio;
        }
    });
    
    inputFin.addEventListener('change', () => {
        const fechaFin = inputFin.value;
        
        if (inputInicio.value && inputInicio.value > fechaFin) {
            inputInicio.value = fechaFin;
        }
    });
    
    if (inputInicio.value) {
        inputFin.min = inputInicio.value;
    }
}

//estadisticas de nuevos usuarios registrados 
async function createChartGraph(conteo_diario, fechas, idChartElement){
    const chartElement = document.getElementById(idChartElement);
    if (!chartElement) {
        console.error('Elemento del gráfico no encontrado');
        return;
    }

    if(newUsersChart){
        newUsersChart.destroy();
    }

    newUsersChart = new Chart(
    chartElement,
    {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [
                {
                label: 'Nuevo usuarios registrados',
                data: conteo_diario
                }
            ]
        },
        options: {
            responsive : true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            }
        }
    }
    );
}

async function createMoneyChartGraph(conteo_diario, fechas, idChartElement){
    const chartElement = document.getElementById(idChartElement);
    if (!chartElement) {
        console.error('Elemento del gráfico no encontrado');
        return;
    }

    if(moneyChart){
        moneyChart.destroy();
    }

    moneyChart = new Chart(
    chartElement,
    {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [
                {
                label: 'Dinero ingresado',
                data: conteo_diario
                }
            ]
        },
        options: {
            responsive : true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            }
        }
    }
    );
}

async function createRentalChartGraph(conteo_diario, fechas, idChartElement){
    const chartElement = document.getElementById(idChartElement);
    if (!chartElement) {
        console.error('Elemento del gráfico no encontrado');
        return;
    }

    if(rentalChart){
        rentalChart.destroy();
    }

    rentalChart = new Chart(
    chartElement,
    {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [
                {
                label: 'Alquileres realizados',
                data: conteo_diario
                }
            ]
        },
        options: {
            responsive : true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                }
            }
        }
    }
    );
}

async function loadUserStatistics(startDate, endDate, endpoint, idErrorMessage, idChartContainer, idChartElement){
    const message = document.getElementById(idErrorMessage);
    const chartContainer = document.querySelector(idChartContainer);

    if (message) {
        message.textContent = '';
        message.style.display = 'none'; // Ocultar el elemento
    }
    
    try {
        const response = await fetch(`${endpoint}?start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cargar estadísticas');
        }
        const data = await response.json();
        console.log('Datos de estadísticas:', data);
        if(chartContainer){
            chartContainer.style.height = '350px';
        }
        else{
            console.error('Contenedor del gráfico no encontrado');
        }
        // createChartGraph(data.conteo_diario, data.fechas, idChartElement);
        // Determinar qué función de gráfico usar según el endpoint
        if (endpoint.includes('money_deposited')) {
            createMoneyChartGraph(data.conteo_diario, data.fechas, idChartElement);
        } else if (endpoint.includes('new_users')) {
            createChartGraph(data.conteo_diario, data.fechas, idChartElement);
        } else if (endpoint.includes('rentals')) {
            createRentalChartGraph(data.conteo_diario, data.fechas, idChartElement);
        }
    } catch(error) {
        console.error(error);
        if (message) {
            message.textContent = error.message;
            message.style.display = 'block';
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    inicializarDatepickers('startDate', 'endDate');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const btn = document.getElementById('btnNewUsers');
    if(btn){
        btn.addEventListener('click', function(){
            if(startDateInput && endDateInput){
                console.log(startDateInput.value, endDateInput.value);
                loadUserStatistics(startDateInput.value, endDateInput.value, ENDPOINT_ESTADISTICAS_USUARIOS, 'errorMessageNewUsers', '.chart-new-users-container', 'newUsersChart');
            }
        });
    }
})

document.addEventListener('DOMContentLoaded', async function () {
    inicializarDatepickers('startDateMoney', 'endDateMoney');
    const startDateInput = document.getElementById('startDateMoney');
    const endDateInput = document.getElementById('endDateMoney');

    const btn = document.getElementById('btnMoneyStats');
    if(btn){
        btn.addEventListener('click', function(){
            if(startDateInput && endDateInput){
                console.log(startDateInput.value, endDateInput.value);
                loadUserStatistics(startDateInput.value, endDateInput.value, ENDPOINT_ESTADISTICAS_DINERO, 'errorMessageMoney', '.chart-money-deposited-container', 'moneyChart');
            }
        });
    }
})

document.addEventListener('DOMContentLoaded', async function () {
    inicializarDatepickers('startDateRental', 'endDateRental');
    const startDateInput = document.getElementById('startDateRental');
    const endDateInput = document.getElementById('endDateRental');

    const btn = document.getElementById('btnRentalStats');
    if(btn){
        btn.addEventListener('click', function(){
            if(startDateInput && endDateInput){
                console.log(startDateInput.value, endDateInput.value);
                loadUserStatistics(startDateInput.value, endDateInput.value, ENDPOINT_ESTADISTICAS_RENTAS, 'errorMessageRentals', '.chart-rentals-container', 'rentalsChart');
            }
        });
    }
})