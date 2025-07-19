let fechasOcupadas = [];
let capacidadPropiedad = 1;
let propiedad = {};

const userRole = sessionStorage.getItem('userRole');
if (userRole !== 'manager' && userRole !== 'employee') {
    window.location.href = '/views/index.html';
}

// Función auxiliar para formatear fechas en YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Obtener parámetros de la URL
function obtenerParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        address: params.get('address'),
        address_number: params.get('address_number'),
        property_city: params.get('property_city'),
        property_province: params.get('property_province'),
        property_floor: params.get('property_floor') || '0',
        property_department: params.get('property_department') || 'N/A',
        price_per_night: parseFloat(params.get('price_per_night')),
        property_name: params.get('property_name')
    };
}

// Cargar información de la propiedad
async function cargarInfoPropiedad() {
    propiedad = obtenerParametrosURL();

    // Mostrar información de la propiedad en la página
    document.getElementById('propiedad-titulo').textContent = propiedad.property_name;
    document.getElementById('propiedad-direccion').textContent = `${propiedad.address} ${propiedad.address_number}`;
    document.getElementById('propiedad-ciudad').textContent = propiedad.property_city;
    document.getElementById('propiedad-provincia').textContent = propiedad.property_province;
    document.getElementById('propiedad-precio').textContent = propiedad.price_per_night.toLocaleString('es-AR');

    // Obtener capacidad de la propiedad
    try {
        const res = await fetch(`http://localhost:5000/api/property?address=${encodeURIComponent(propiedad.address)}&address_number=${propiedad.address_number}&property_city=${encodeURIComponent(propiedad.property_city)}&property_province=${encodeURIComponent(propiedad.property_province)}&property_floor=${encodeURIComponent(propiedad.property_floor)}&property_department=${encodeURIComponent(propiedad.property_department)}`);
        const data = await res.json();
        if (data.property && data.property.capacity) {
            capacidadPropiedad = parseInt(data.property.capacity);
            document.getElementById('propiedad-capacidad').textContent = capacidadPropiedad;
            document.getElementById('cantidad_personas').max = capacidadPropiedad;

            const selectCantidad = document.getElementById('cantidad_personas');
            selectCantidad.innerHTML = '<option value="">Seleccione...</option>';
            for (let i = 1; i <= capacidadPropiedad; i++) {
                selectCantidad.innerHTML += `<option value="${i}">${i}</option>`;
            }
        } else {
            throw new Error('No se encontró la capacidad de la propiedad');
        }
    } catch (error) {
        console.error('Error al obtener capacidad:', error);
        document.getElementById('propiedad-capacidad').textContent = 'No disponible';
        document.getElementById('cantidad_personas').max = 1;
        mostrarError('Error al cargar la capacidad de la propiedad.');
    }

    // Obtener fechas ocupadas
    try {
        const res = await fetch(`http://localhost:5000/rentals/booked-dates?address=${encodeURIComponent(propiedad.address)}&address_number=${propiedad.address_number}&property_city=${encodeURIComponent(propiedad.property_city)}&property_province=${encodeURIComponent(propiedad.property_province)}&property_floor=${encodeURIComponent(propiedad.property_floor)}&property_department=${encodeURIComponent(propiedad.property_department)}`);
        const data = await res.json();
        fechasOcupadas = data.fechas || [];
    } catch (error) {
        console.error('Error al obtener fechas ocupadas:', error);
        fechasOcupadas = [];
        mostrarError('Error al cargar fechas ocupadas.');
    }

    inicializarDatepickers();
}

// Inicializar datepickers
function inicializarDatepickers() {
    const hoy = new Date();

    // Configuración común
    const datepickerOptions = {
        format: 'yyyy-mm-dd',
        language: 'es',
        autoclose: true,
        todayHighlight: true,
        startDate: hoy,
        clearBtn: false
    };

    // Inicializar fecha de ingreso
    $('#fecha_ingreso').datepicker({
        ...datepickerOptions,
        beforeShowDay: function (date) {
            const fechaStr = formatDateToYYYYMMDD(date);
            const esFechaOcupada = fechasOcupadas.includes(fechaStr);
            return {
                enabled: !esFechaOcupada,
                classes: esFechaOcupada ? 'fecha-ocupada' : '',
                tooltip: esFechaOcupada ? 'Ocupada' : ''
            };
        }
    }).on('changeDate', function (e) {
        if (e.date) {
            const fechaMañana = new Date(e.date);
            fechaMañana.setDate(fechaMañana.getDate() + 1);
            $('#fecha_egreso').datepicker('setStartDate', fechaMañana);

            // Actualizar valor en formato YYYY-MM-DD
            document.getElementById('fecha_ingreso').value = formatDateToYYYYMMDD(e.date);
            validarFormulario();
        }
    });

    // Inicializar fecha de egreso
    $('#fecha_egreso').datepicker({
        ...datepickerOptions,
        startDate: new Date(hoy.getTime() + 24 * 60 * 60 * 1000),
        beforeShowDay: function (date) {
            const fechaStr = formatDateToYYYYMMDD(date);
            const esFechaOcupada = fechasOcupadas.includes(fechaStr);
            return {
                enabled: !esFechaOcupada,
                classes: esFechaOcupada ? 'fecha-ocupada' : '',
                tooltip: esFechaOcupada ? 'Ocupada' : ''
            };
        }
    }).on('changeDate', function (e) {
        if (e.date) {
            document.getElementById('fecha_egreso').value = formatDateToYYYYMMDD(e.date);
            validarFormulario();
        }
    });
}

// Validar formulario
function validarFormulario() {
    const checkin = document.getElementById('fecha_ingreso').value;
    const checkout = document.getElementById('fecha_egreso').value;
    const cantidadInput = document.getElementById('cantidad_personas');
    const cantidad = parseInt(cantidadInput.value) || 0;
    const btn = document.getElementById('btn-reservar');
    let valido = true;

    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!checkin || !checkout || !dateRegex.test(checkin) || !dateRegex.test(checkout)) {
        valido = false;
    } else {
        const fechaIn = new Date(checkin + 'T00:00:00');
        const fechaOut = new Date(checkout + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (isNaN(fechaIn) || isNaN(fechaOut)) {
            valido = false;
        } else if (fechaIn < hoy) {
            valido = false;
        } else if (fechaIn >= fechaOut) {
            valido = false;
        }
        // NO verificar fechas ocupadas aquí
    }

    // Solo mostrar alerta si el usuario ya eligió una opción
    if (cantidadInput.value !== '') {
        if (!cantidad || cantidad < 1 || cantidad > capacidadPropiedad) {
            valido = false;
            Swal.fire('Cantidad inválida', `La cantidad de personas debe ser válida (1 a ${capacidadPropiedad}).`, 'warning');
        }
    }

    btn.disabled = !valido;
    return valido;
}

function mostrarError(mensaje) {
    const mensajeElement = document.getElementById('mensaje-reserva');
    mensajeElement.textContent = mensaje;
    mensajeElement.style.display = 'block';
}

function ocultarError() {
    document.getElementById('mensaje-reserva').style.display = 'none';
}

async function enviarReserva(e) {
    e.preventDefault();

    if (!validarFormulario()) {
        Swal.fire('Campos incompletos', 'Por favor, completa todos los campos correctamente.', 'warning');
        return;
    }

    // Verificar fechas ocupadas en el rango seleccionado
    const fecha_ingreso = document.getElementById('fecha_ingreso').value;
    const fecha_egreso = document.getElementById('fecha_egreso').value;
    const fechaIngresoDate = new Date(fecha_ingreso + 'T00:00:00');
    const fechaEgresoDate = new Date(fecha_egreso + 'T00:00:00');
    let fechasOcupadasEnRango = [];
    let d = new Date(fechaIngresoDate);
    while (d < fechaEgresoDate) {
        const fechaStr = formatDateToYYYYMMDD(d);
        if (fechasOcupadas.includes(fechaStr)) {
            fechasOcupadasEnRango.push(fechaStr);
        }
        d.setDate(d.getDate() + 1);
    }
    if (fechasOcupadasEnRango.length > 0) {
        Swal.fire('Fechas no disponibles', `Las siguientes fechas están ocupadas: ${fechasOcupadasEnRango.join(', ')}`, 'error');
        return;
    }

    const tenant_username = document.getElementById('tenant_username').value.trim();
    const cantidad_personas = parseInt(document.getElementById('cantidad_personas').value);

    if (!tenant_username) {
        Swal.fire('Falta usuario', 'Debes ingresar un usuario cliente.', 'warning');
        return;
    }

    // Verificar si el usuario existe
    try {
        const resp = await fetch(`http://localhost:5000/tenants?username=${encodeURIComponent(tenant_username)}`);
        if (!resp.ok) {
            const userRole = sessionStorage.getItem('userRole');
            let dashboardUrl = '/views/dashboard.html';
            if (userRole === 'employee') dashboardUrl = '/views/dashboard-employee.html';
            if (userRole === 'manager') dashboardUrl = '/views/dashboard-manager.html';

            Swal.fire({
                title: 'Usuario no encontrado',
                html: `El usuario ingresado no existe.<br><br>
                <button id="btnRegistrarUsuario" class="swal2-confirm swal2-styled" style="margin-top:10px;">¿Quieres registrar a este usuario?</button>`,
                icon: 'error',
                showConfirmButton: false,
                didOpen: () => {
                    document.getElementById('btnRegistrarUsuario').onclick = function () {
                        window.location.href = dashboardUrl;
                    };
                }
            });
            return;
        }
    } catch (error) {
        console.error('Error al verificar usuario:', error);
        Swal.fire('Error', 'Error al verificar el usuario.', 'error');
        return;
    }

    // Calcular total
    const noches = Math.ceil((fechaEgresoDate - fechaIngresoDate) / (1000 * 60 * 60 * 24));
    const total = noches * propiedad.price_per_night;

    // Confirmar monto
    const confirm = await Swal.fire({
        title: 'Confirmar reserva',
        html: `<div class="mb-2">Vas a reservar <b>${propiedad.property_name}</b> para <b>${tenant_username}</b>.<br>
        <b>${noches}</b> noche(s) x <b>$${propiedad.price_per_night.toLocaleString('es-AR')}</b> = <span class="fw-bold text-success" style="font-size:1.3em;">$${total.toLocaleString('es-AR')}</span></div>
        ¿Deseas continuar?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Sí, reservar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    // Preparar datos de la reserva
    const reserva = {
        property_address: propiedad.address,
        property_address_number: parseInt(propiedad.address_number),
        property_city: propiedad.property_city,
        property_province: propiedad.property_province,
        property_floor: propiedad.property_floor || '0',
        property_department: propiedad.property_department || 'N/A',
        tenant_username,
        cantidad_personas,
        fecha_tentativa_ingreso: fecha_ingreso,
        fecha_tentativa_salida: fecha_egreso,
        total
    };

    // Enviar reserva al backend
    try {
        const res = await fetch('http://localhost:5000/cargar/rental', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reserva)
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({
                title: '¡Reserva realizada!',
                text: 'La reserva fue registrada correctamente.',
                icon: 'success',
                confirmButtonText: 'Volver a alquileres'
            });
            window.location.href = '/views/rentals.html';
        } else {
            Swal.fire('Error', data.error || 'Error al registrar la reserva.', 'error');
        }
    } catch (error) {
        console.error('Error al enviar reserva:', error);
        Swal.fire('Error', 'Error al conectar con el servidor.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarInfoPropiedad();

    document.getElementById('formReserva').addEventListener('submit', enviarReserva);
    document.getElementById('cantidad_personas').addEventListener('input', validarFormulario);
    document.getElementById('fecha_ingreso').addEventListener('change', validarFormulario);
    document.getElementById('fecha_egreso').addEventListener('change', validarFormulario);

    // Búsqueda interactiva de usuarios tenant
    const inputTenant = document.getElementById('tenant_username');
    const listaCoincidencias = document.getElementById('listaCoincidenciasTenant');

    let ultimoQuery = '';
    inputTenant.addEventListener('input', async function () {
        const query = inputTenant.value.trim();
        listaCoincidencias.innerHTML = '';
        if (query.length < 2) return;

        ultimoQuery = query;

        try {
            const res = await fetch(`http://localhost:5000/tenants/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();

            // Solo mostrar si coincide con el último query
            if (query !== ultimoQuery) return;

            if (Array.isArray(data.tenants) && data.tenants.length > 0) {
                data.tenants.forEach(tenant => {
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'list-group-item list-group-item-action';
                    item.textContent = tenant.username;
                    item.onclick = () => {
                        inputTenant.value = tenant.username;
                        listaCoincidencias.innerHTML = '';
                        validarFormulario();
                    };
                    listaCoincidencias.appendChild(item);
                });
            } else {
                const item = document.createElement('div');
                item.className = 'list-group-item text-muted';
                item.textContent = 'No hay coincidencias';
                listaCoincidencias.appendChild(item);
            }
        } catch (error) {
            listaCoincidencias.innerHTML = '<div class="list-group-item text-danger">Error al buscar usuarios</div>';
        }
    });

    document.addEventListener('click', function (e) {
        if (!inputTenant.contains(e.target) && !listaCoincidencias.contains(e.target)) {
            listaCoincidencias.innerHTML = '';
        }
    });
});