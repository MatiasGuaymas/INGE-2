const ENDPOINT_LISTAR_RENTALS = 'http://localhost:5000/rentals';
const ENDPOINT_LISTAR_PROPIEDADES = 'http://localhost:5000/searchProperty';
const ENDPOINT_SEARCH_RENTALS = 'http://localhost:5000/searchRentals';
const ENDPOINT_KEY_HANDOVER = 'http://localhost:5000/rentals/key_handover';
const ENDPOINT_KEY_RETURN = 'http://localhost:5000/rentals/key_return';
const listaPropiedades = document.getElementById('listaPropiedades');
const listaActivos = document.getElementById("listaAlquileresActivos");
const listaCancelados = document.getElementById("listaAlquileresCancelados");
const listaRentals = document.getElementById('listaRentals');
const pagination = document.getElementById('pagination');
const paginationRentals = document.getElementById('paginationRentals');

let currentPage = 1;
let currentRentalsPage = 1;
let totalProperties = 0;
let totalPropertiesBD = null;
const perPage = 9;
const perPageRentals = 9;

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

function renderStars(average) {
    if (average === null || average === undefined) return '<span class="text-muted" style="font-size:0.95em;">Sin calificación</span>';
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (average >= i) {
            html += '<i class="bi bi-star-fill text-warning"></i>';
        } else if (average >= i - 0.5) {
            html += '<i class="bi bi-star-half text-warning"></i>';
        } else {
            html += '<i class="bi bi-star text-warning"></i>';
        }
    }
    return html + `<span class="ms-2" style="font-size:0.95em;">${average.toFixed(1)}</span>`;
}

function traducirPolitica(politica) {
    switch (politica) {
        case 'flexible': return 'Flexible';
        case 'moderate': return 'Moderada';
        case 'strict': return 'Estricta';
        default: return politica;
    }
}

function renderPropiedades(propiedades) {
    listaPropiedades.innerHTML = '';
    if (!propiedades || propiedades.length === 0) {
        let mensaje;
        if (totalPropertiesBD === 0) {
            mensaje = 'No hay propiedades cargadas actualmente.';
        } else {
            mensaje = 'No hay propiedades que coincidan con los filtros de búsqueda seleccionados.';
        }
        listaPropiedades.innerHTML =
            `<div class="col-12">
                <div class="alert alert-info text-center" role="alert">
                    ${mensaje}
                </div>
            </div>`;
        return;
    }
    propiedades.forEach((prop, idx) => {
        let imgSrc = prop.image_url
            ? `http://localhost:5000/${prop.image_url}`
            : (prop.image_urls && prop.image_urls.length > 0
                ? `http://localhost:5000${prop.image_urls[0]}`
                : `http://localhost:5000/default.jpg`);
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-3 d-flex align-items-stretch';
        card.setAttribute('data-aos', 'fade-up');
        card.setAttribute('data-aos-duration', '900');
        card.setAttribute('data-aos-delay', `${100 + idx * 80}`);
        card.innerHTML =
            `<div class="property-wrap ftco-animate">
                <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor ?? '')}&property_department=${encodeURIComponent(prop.department ?? '')}&price_per_night=${prop.price_per_night}" class="img" style="background-image: url('${imgSrc}');"></a>
                <div class="text" style="margin-left: 45px;">
                    <p class="price mb-2"><span class="orig-price">$${prop.price_per_night}<small>/noche</small></span></p>
                    <div class="mb-2">${renderStars(prop.average_rating)}</div>
                    <ul class="property_list" style="flex-direction:column;align-items:center;">
                        <li><span class="flaticon-bed"></span>${prop.capacity}</li>
                        <li style="display:block;width:100%;text-align:center;margin-top:4px;">
                            <strong>Política:</strong> ${traducirPolitica(prop.politica_de_cancelacion)}
                        </li>
                    </ul>
                    <h3>
                        <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor ?? '')}&property_department=${encodeURIComponent(prop.department ?? '')}&price_per_night=${prop.price_per_night}" class="truncate-text" title="${prop.property_name}">
                            ${prop.property_name}
                        </a>
                    </h3>
                    <span class="location truncate-text" title="${prop.city}, ${prop.province}">${prop.city}, ${prop.province}</span>
                    <div class="d-flex flex-column gap-3 mt-2">
                        <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor ?? '')}&property_department=${encodeURIComponent(prop.department ?? '')}&price_per_night=${prop.price_per_night}" class="btn btn-outline-primary btn-sm w-100 mb-2">Ver propiedad</a>
                        <a href="/views/crear-reserva.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor ?? '')}&property_department=${encodeURIComponent(prop.department ?? '')}&price_per_night=${prop.price_per_night}&property_name=${encodeURIComponent(prop.property_name)}" class="btn btn-success btn-sm w-100">
                            Reservar
                        </a>
                    </div>
                </div>
            </div>`;
        listaPropiedades.appendChild(card);
    });
    if (window.AOS) AOS.init();
}

function renderPagination(total) {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return;
    let html = '<ul>';
    if (currentPage > 1) {
        html += `<li><a href="#" onclick="goToPage(${currentPage - 1});return false;"><</a></li>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<li class="active"><span>${i}</span></li>`;
        } else {
            html += `<li><a href="#" onclick="goToPage(${i});return false;">${i}</a></li>`;
        }
    }
    if (currentPage < totalPages) {
        html += `<li><a href="#" onclick="goToPage(${currentPage + 1});return false;">></a></li>`;
    }
    html += '</ul>';
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    fetchPropiedades();
}

function getSearchParams() {
    return {
        province: document.getElementById('province')?.value,
        city: document.getElementById('city')?.value,
        capacity: document.getElementById('search-capacity')?.value,
        price_min: document.getElementById('search-price-min')?.value,
        price_max: document.getElementById('search-price-max')?.value,
        cancel_policy: document.getElementById('search-cancel-policy')?.value,
        date_in: document.getElementById('search-date-in')?.value,
        date_out: document.getElementById('search-date-out')?.value
    };
}

function fetchPropiedades() {
    const params = getSearchParams();
    let url = new URL(ENDPOINT_LISTAR_PROPIEDADES);
    url.searchParams.set('page', currentPage);
    url.searchParams.set('per_page', perPage);

    if (params.province) url.searchParams.append('province', params.province);
    if (params.city) url.searchParams.append('city', params.city);
    if (params.capacity) url.searchParams.append('capacity', params.capacity);
    if (params.price_min) url.searchParams.append('price_per_night_min', params.price_min);
    if (params.price_max) url.searchParams.append('price_per_night_max', params.price_max);
    if (params.cancel_policy) url.searchParams.append('politica_de_cancelacion', params.cancel_policy);
    if (params.date_in) url.searchParams.append('fecha_ingreso', params.date_in);
    if (params.date_out) url.searchParams.append('fecha_egreso', params.date_out);

    fetch(url)
        .then(async res => {
            if (!res.ok) {
                let errorMsg = res.statusText || 'Error al cargar las propiedades';
                try {
                    const data = await res.json();
                    if (data && data.error) errorMsg = data.error;
                } catch { }
                throw new Error(errorMsg);
            }
            return res.json();
        })
        .then(data => {
            renderPropiedades(data.properties);
            totalProperties = data.total;
            renderPagination(totalProperties);
        })
        .catch(err => {
            listaPropiedades.innerHTML =
                `<div class="col-12">
                    <div class="alert alert-danger text-center" role="alert">
                        Error al cargar las propiedades.<br>${err.message}
                    </div>
                </div>`;
            if (pagination) pagination.innerHTML = '';
        });
}

function fetchTotalPropertiesBD() {
    fetch(`${ENDPOINT_LISTAR_PROPIEDADES}?page=1&per_page=1`)
        .then(res => res.json())
        .then(data => {
            totalPropertiesBD = data.total;
        });
}

// Modifica fetchRentals para incluir finalizados y traer datos del inquilino
function renderRentalCard(alquiler, tipo) {
    let tipoLabel = '';
    let botonesLlaves = '';

    if (tipo === 'cancelado' || tipo === 'finalizado') {
        tipoLabel = tipo === 'cancelado' ?
            `<p class="card-text text-danger mt-2">Alquiler cancelado</p>` :
            `<p class="card-text text-success mt-2">Alquiler finalizado</p>`;
    } else if (tipo === 'activo') {
        // Solo mostrar botones de llaves para alquileres activos
        const llaveEntregada = alquiler.fecha_entrega_llave ? true : false;
        const llaveDevuelta = alquiler.fecha_devolucion_llave ? true : false;

        if (!llaveEntregada) {
            botonesLlaves = `<button class="btn btn-success btn-sm me-2" onclick="registrarEntregaLlave('${alquiler.id}', '${alquiler.tenant_dni}')">Registrar entrega de llave</button>`;
        } else if (!llaveDevuelta) {
            // Modificación: eliminar el cartel verde y mostrar solo el botón
            botonesLlaves = `<button class="btn btn-info btn-sm me-2" onclick="registrarDevolucionLlave('${alquiler.id}', '${alquiler.tenant_dni}')">Registrar devolución de llave</button>`;
        } else {
            // Si ya devolvió la llave, no mostramos ningún botón ni cartel
            botonesLlaves = '';
        }
    }

    // Crear el HTML para mostrar el motivo de devolución temprana si existe
    let motivoDevolucion = '';
    if (alquiler.motivo_devolucion_temprana) {
        motivoDevolucion = `
            <div class="alert alert-warning py-1 px-2 my-1">
                <strong>Motivo de devolución temprana:</strong> ${alquiler.motivo_devolucion_temprana}
            </div>`;
    }

    return `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">🏠 ${alquiler.property_name || ''}</h5>
                <p class="card-text"><strong>Dirección:</strong> ${alquiler.property_address || ''} ${alquiler.property_address_number || ''}, Piso: ${alquiler.property_floor || '-'}, Depto: ${alquiler.property_department || '-'}</p>
                <p class="card-text"><strong>Ubicación:</strong> ${alquiler.property_city || ''}, ${alquiler.property_province || ''}</p>
                <hr>
                <p class="card-text"><strong>👤 Inquilino:</strong> ${alquiler.tenant_first_name || '-'} ${alquiler.tenant_last_name || '-'}<br>
                <strong>DNI:</strong> ${alquiler.tenant_dni || '-'}<br>
                <strong>Teléfono:</strong> ${alquiler.tenant_phone || '-'}<br>
                <strong>Email:</strong> ${alquiler.tenant_email || '-'}<br>
                <strong>Username:</strong> ${alquiler.tenant_username || '-'}</p>
                <hr>
                <p class="card-text"><strong>📅 Fechas:</strong><br>
                <strong>Ingreso:</strong> ${formatFecha(alquiler.fecha_tentativa_ingreso)}<br>
                <strong>Salida:</strong> ${formatFecha(alquiler.fecha_tentativa_salida)}<br>
                <strong>Entrega llaves:</strong> ${formatFecha(alquiler.fecha_entrega_llave)}<br>
                <strong>Devolución llaves:</strong> ${formatFecha(alquiler.fecha_devolucion_llave)}</p>
                ${motivoDevolucion}
                <hr>
                <p class="card-text"><strong>💰 Monto total:</strong> $${alquiler.total || '-'}<br>
                <strong>Cantidad de personas:</strong> ${alquiler.cantidad_personas || '-'}</p>
                <div class="mt-2 d-flex flex-wrap gap-2">
                    ${botonesLlaves}
                    ${tipo === 'activo' ? `<button class="btn btn-danger btn-sm" onclick="cancelarAlquiler('${alquiler.id}', '${alquiler.tenant_username}')">Cancelar</button>` : ''}
                </div>
                ${tipoLabel}
            </div>
        </div>
    `;
}

function renderActivos(alquileres) {
    listaActivos.innerHTML = '';
    if (!alquileres || alquileres.length === 0) {
        listaActivos.innerHTML = '<p class="text-center">No hay alquileres activos.</p>';
        return;
    }
    alquileres.forEach(alquiler => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = renderRentalCard(alquiler, 'activo');
        listaActivos.appendChild(card);
    });
}

function renderCancelados(alquileres) {
    listaCancelados.innerHTML = '';
    if (!alquileres || alquileres.length === 0) {
        listaCancelados.innerHTML = '<p class="text-center">No hay alquileres cancelados.</p>';
        return;
    }
    alquileres.forEach(alquiler => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = renderRentalCard(alquiler, 'cancelado');
        listaCancelados.appendChild(card);
    });
}

function renderFinalizados(alquileres) {
    const listaFinalizados = document.getElementById("listaAlquileresFinalizados");
    listaFinalizados.innerHTML = '';
    if (!alquileres || alquileres.length === 0) {
        listaFinalizados.innerHTML = '<p class="text-center">No hay alquileres finalizados.</p>';
        return;
    }
    alquileres.forEach(alquiler => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = renderRentalCard(alquiler, 'finalizado');
        listaFinalizados.appendChild(card);
    });
}

// Modifica fetchRentals para incluir finalizados y traer datos del inquilino
function fetchRentals() {
    fetch(ENDPOINT_LISTAR_RENTALS)
        .then(response => response.json())
        .then(async data => {
            const hoy = new Date();
            let allRentals = [...(data.activos || []), ...(data.cancelados || []), ...(data.finalizados || [])];
            // Traer datos extra del inquilino para cada rental
            for (let r of allRentals) {
                try {
                    const res = await fetch(`/user_profile?username=${r.tenant_username}`);
                    if (res.ok) {
                        const user = await res.json();
                        r.tenant_first_name = user.first_name || '-';
                        r.tenant_last_name = user.last_name || '-';
                        r.tenant_dni = user.dni || '-';
                        r.tenant_phone = user.phone || '-';
                        r.tenant_email = user.email || '-';
                    }
                } catch { }
            }

            renderActivos(data.activos);
            renderCancelados(data.cancelados);
            renderFinalizados(data.finalizados);
        })
        .catch(error => {
            console.error('Error al obtener los alquileres:', error);
            listaActivos.innerHTML = '<p class="text-center">Error al cargar los alquileres activos.</p>';
            listaCancelados.innerHTML = '<p class="text-center">Error al cargar los alquileres cancelados.</p>';
            document.getElementById("listaAlquileresFinalizados").innerHTML = '<p class="text-center">Error al cargar los alquileres finalizados.</p>';
        });
}

function formatFecha(fechaStr) {
    if (!fechaStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
    if (fechaStr.includes('T')) return fechaStr.split('T')[0];
    try {
        const d = new Date(fechaStr);
        if (!isNaN(d.getTime())) {
            return formatDateToYYYYMMDD(d);
        }
    } catch (error) {
        console.error('Error al formatear fecha:', error);
    }
    return fechaStr;
}

async function cancelarAlquiler(id, username) {
    const confirm = await Swal.fire({
        title: '¿Cancelar alquiler?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No'
    });
    if (confirm.isConfirmed) {
        try {
            const res = await fetch('http://localhost:5000/rentals/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rental_id: id, username })
            });
            const data = await res.json();
            if (res.ok) {
                Swal.fire('¡Cancelado!', 'El alquiler fue cancelado correctamente.', 'success');
                fetchRentals();
            } else {
                Swal.fire('Error', data.error || 'No se pudo cancelar el alquiler.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error al conectar con el servidor.', 'error');
            console.error('Error al cancelar alquiler:', error);
        }
    }
}

// Función para registrar entrega de llave - Modificada
async function registrarEntregaLlave(rentalId, dniInquilino) {
    // Ya no usamos el DNI pasado como parámetro
    const { value: dniInput, isConfirmed } = await Swal.fire({
        title: 'Registrar Entrega de Llave',
        html: `
            <p class="mb-3">Verifique la identidad del cliente ingresando su DNI:</p>
            <input id="swal-dni" class="swal2-input" placeholder="DNI">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Registrar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const dniValue = document.getElementById('swal-dni').value;
            if (!dniValue.trim()) {
                Swal.showValidationMessage('Por favor ingrese el DNI del inquilino');
                return false;
            }
            return dniValue.trim();
        }
    });

    if (!isConfirmed) {
        // Escenario 4: El usuario canceló la operación
        return;
    }

    try {
        const response = await fetch(ENDPOINT_KEY_HANDOVER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rental_id: rentalId,
                dni: dniInput
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Escenario 1: Registro exitoso
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: data.message || 'Entrega de llave registrada con éxito'
            });
            // Actualizar la lista de alquileres
            fetchRentals();
        } else {
            // Escenario 2: Llave ya entregada
            // Escenario 3: DNI incorrecto
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error || 'Ha ocurrido un error al registrar la entrega de llave'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor'
        });
    }
}

// Función para registrar devolución de llave - Modificada
async function registrarDevolucionLlave(rentalId, dniInquilino) {
    // Ya no usamos el DNI pasado como parámetro
    const { value: dniInput, isConfirmed: dniConfirmado } = await Swal.fire({
        title: 'Registrar Devolución de Llave',
        html: `
            <p class="mb-3">Verifique la identidad del cliente ingresando su DNI:</p>
            <input id="swal-dni" class="swal2-input" placeholder="DNI">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const dniValue = document.getElementById('swal-dni').value;
            if (!dniValue.trim()) {
                Swal.showValidationMessage('Por favor ingrese el DNI del inquilino');
                return false;
            }
            return dniValue.trim();
        }
    });

    if (!dniConfirmado) {
        // Escenario 6: El usuario canceló la operación
        return;
    }

    // El resto de la función permanece igual...
    const fechaActual = new Date();
    const fechaHoy = formatDateToYYYYMMDD(fechaActual);

    try {
        // Obtener información de la reserva
        const infoResponse = await fetch(`http://localhost:5000/rental/${rentalId}`);
        if (!infoResponse.ok) {
            throw new Error('Error al obtener información de la reserva');
        }

        const infoData = await infoResponse.json();
        const fechaSalida = infoData.rental.fecha_tentativa_salida;

        let motivo = null;
        let esTemprana = false;

        // Si la fecha actual es anterior a la fecha de salida prevista, es devolución temprana
        if (fechaHoy < fechaSalida) {
            esTemprana = true;
            // Solicitar motivo para devolución temprana (Escenario 2)
            const { value: motivoInput, isConfirmed: motivoConfirmado } = await Swal.fire({
                title: 'Devolución Anticipada',
                html: `
                    <p class="mb-3">La fecha de salida prevista era ${fechaSalida}, pero se está devolviendo la llave antes. Por favor, indique el motivo:</p>
                    <textarea id="swal-motivo" class="swal2-textarea" placeholder="Motivo de la devolución anticipada"></textarea>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Registrar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const motivoValue = document.getElementById('swal-motivo').value;
                    if (!motivoValue.trim()) {
                        Swal.showValidationMessage('Por favor ingrese el motivo de la devolución anticipada');
                        return false;
                    }
                    return motivoValue.trim();
                }
            });

            if (!motivoConfirmado) {
                // También es parte del Escenario 6
                return;
            }

            motivo = motivoInput;
        }

        // Ahora procedemos con el registro de la devolución
        const response = await fetch(ENDPOINT_KEY_RETURN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rental_id: rentalId,
                dni: dniInput,
                motivo_devolucion_temprana: motivo
            })
        });

        const data = await response.json();

        if (!response.ok) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error || 'Ha ocurrido un error al registrar la devolución de llave'
            });
            return;
        }

        // Escenario 1 y 2: Devolución exitosa
        let mensaje = data.message;
        if (esTemprana) {
            mensaje += '. Se ha actualizado la fecha de finalización del alquiler a la fecha actual.';
        }

        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: mensaje
        });

        // Actualizar la lista de alquileres
        fetchRentals();

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo conectar con el servidor'
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchTotalPropertiesBD();
    fetchPropiedades();
    fetchRentals();

    // Cargar provincias
    fetch('https://apis.datos.gob.ar/georef/api/provincias')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('province');
            if (!select) return;
            select.innerHTML = '<option value="" disabled selected>Seleccione una provincia</option>';
            data.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.provincias.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.nombre;
                option.textContent = prov.nombre;
                select.appendChild(option);
            });
        })
        .catch(err => console.error('Error cargando provincias:', err));

    // Cargar ciudades según provincia seleccionada
    const selectProvince = document.getElementById('province');
    if (selectProvince) {
        selectProvince.addEventListener('change', function () {
            const provinciaSeleccionada = this.value;
            const citySelect = document.getElementById('city');
            if (!citySelect) return;
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
    }

    // Provincias para rentals
    fetch('https://apis.datos.gob.ar/georef/api/provincias')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('search-province');
            if (!select) return;
            select.innerHTML = '<option value="" selected>Cualquiera</option>';
            data.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));
            data.provincias.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.nombre;
                option.textContent = prov.nombre;
                select.appendChild(option);
            });
        });

    // Ciudades para rentals
    const selectProvinceRentals = document.getElementById('search-province');
    if (selectProvinceRentals) {
        selectProvinceRentals.addEventListener('change', function () {
            const provinciaSeleccionada = this.value;
            const citySelect = document.getElementById('search-city');
            if (!citySelect) return;
            citySelect.innerHTML = '<option value="" selected>Cualquiera</option>';
            if (!provinciaSeleccionada) return;
            fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinciaSeleccionada)}&max=500`)
                .then(response => response.json())
                .then(data => {
                    citySelect.innerHTML = '<option value="" selected>Cualquiera</option>';
                    data.localidades.sort((a, b) => a.nombre.localeCompare(b.nombre));
                    data.localidades.forEach(loc => {
                        const option = document.createElement('option');
                        option.value = loc.nombre;
                        option.textContent = loc.nombre;
                        citySelect.appendChild(option);
                    });
                });
        });
    }

    // Inicializar datepickers
    const hoy = new Date();
    $('#search-date-in').datepicker({
        format: 'yyyy-mm-dd',
        language: 'es',
        autoclose: true,
        todayHighlight: true,
        startDate: hoy,
        clearBtn: true
    }).on('changeDate', function (e) {
        if (e.date) {
            const fechaMañana = new Date(e.date);
            fechaMañana.setDate(fechaMañana.getDate() + 1);
            $('#search-date-out').datepicker('setStartDate', fechaMañana);
            document.getElementById('search-date-in').value = formatDateToYYYYMMDD(e.date);
        }
    });

    $('#search-date-out').datepicker({
        format: 'yyyy-mm-dd',
        language: 'es',
        autoclose: true,
        todayHighlight: true,
        startDate: new Date(hoy.getTime() + 24 * 60 * 60 * 1000),
        clearBtn: true
    }).on('changeDate', function (e) {
        if (e.date) {
            document.getElementById('search-date-out').value = formatDateToYYYYMMDD(e.date);
        }
    });
});

document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const capacidadRaw = document.getElementById('search-capacity').value;
    const precioMinRaw = document.getElementById('search-price-min').value;
    const precioMaxRaw = document.getElementById('search-price-max').value;
    const fechaIn = document.getElementById('search-date-in').value;
    const fechaOut = document.getElementById('search-date-out').value;

    const capacidad = capacidadRaw === '' ? 1 : parseInt(capacidadRaw);
    const precioMin = precioMinRaw !== '' ? parseInt(precioMinRaw) : null;
    const precioMax = precioMaxRaw !== '' ? parseInt(precioMaxRaw) : null;

    if (isNaN(capacidad) || capacidad < 1) {
        Swal.fire('Capacidad inválida', 'La capacidad debe ser un número mayor o igual a 1.', 'warning');
        return;
    }
    if (precioMinRaw !== '' && (isNaN(precioMin) || precioMin <= 0)) {
        Swal.fire('Precio mínimo inválido', 'El precio mínimo debe ser un número mayor a 0.', 'warning');
        return;
    }
    if (precioMaxRaw !== '' && (isNaN(precioMax) || precioMax <= 0)) {
        Swal.fire('Precio máximo inválido', 'El precio máximo debe ser un número mayor a 0.', 'warning');
        return;
    }
    if (precioMin !== null && precioMax !== null && precioMin > precioMax) {
        Swal.fire('Rango de precios inválido', 'El precio mínimo no puede ser mayor al máximo.', 'warning');
        return;
    }
    if (fechaIn && fechaOut && fechaIn >= fechaOut) {
        Swal.fire('Fechas inválidas', 'La fecha de egreso debe ser posterior a la de ingreso.', 'warning');
        return;
    }

    currentPage = 1;
    fetchPropiedades();
});

// Obtener parámetros del formulario
function getSearchRentalsParams() {
    return {
        dni: document.getElementById('search-dni')?.value,
        city: document.getElementById('search-city')?.value,
        province: document.getElementById('search-province')?.value,
        sin_entrega_llave: document.getElementById('search-sin-entrega-llave')?.checked ? 'true' : 'false',
        sin_devolucion_llave: document.getElementById('search-sin-devolucion-llave')?.checked ? 'true' : 'false'
    };
}

// Renderizar rentals
function renderRentals(rentals, total, mensaje) {
    listaRentals.innerHTML = '';
    if (!rentals || rentals.length === 0) {
        listaRentals.innerHTML =
            `<div class="col-12">
                <div class="alert alert-info text-center" role="alert">
                    ${mensaje || (total === 0 ? 'No hay alquileres cargados actualmente.' : 'No hay alquileres que coincidan con los filtros de búsqueda seleccionados.')}
                </div>
            </div>`;
        paginationRentals.innerHTML = '';
        return;
    }
    rentals.forEach((r, idx) => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-3 d-flex align-items-stretch';
        card.innerHTML = `
            <div class="property-wrap ftco-animate">
                <div class="text">
                    <h3>
                        <span title="${r.property_name}">${r.property_name}</span>
                    </h3>
                    <span class="location truncate-text" title="${r.property_city}, ${r.property_province}">${r.property_city}, ${r.property_province}</span>
                    <ul class="property_list" style="flex-direction:column;align-items:center;">
                        <li><strong>Dirección:</strong> ${r.property_address} ${r.property_address_number}, Piso: ${r.property_floor}, Depto: ${r.property_department}</li>
                        <li><strong>Inquilino:</strong> ${r.tenant_first_name} ${r.tenant_last_name} (DNI: ${r.tenant_dni})</li>
                        <li><strong>Ingreso:</strong> ${r.fecha_tentativa_ingreso} <strong>Salida:</strong> ${r.fecha_tentativa_salida}</li>
                        <li><strong>Entrega llaves:</strong> ${r.fecha_entrega_llave || '-'}</li>
                        <li><strong>Devolución llaves:</strong> ${r.fecha_devolucion_llave || '-'}</li>
                        <li><strong>Personas:</strong> ${r.cantidad_personas} <strong>Total:</strong> $${r.total}</li>
                    </ul>
                </div>
            </div>`;
        listaRentals.appendChild(card);
    });
    renderPaginationRentals(total);
}

// Paginación para rentals
function renderPaginationRentals(total) {
    paginationRentals.innerHTML = '';
    const totalPages = Math.ceil(total / perPageRentals);
    if (totalPages <= 1) return;
    let html = '<ul>';
    if (currentRentalsPage > 1) {
        html += `<li><a href="#" onclick="goToRentalsPage(${currentRentalsPage - 1});return false;"><</a></li>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentRentalsPage) {
            html += `<li class="active"><span>${i}</span></li>`;
        } else {
            html += `<li><a href="#" onclick="goToRentalsPage(${i});return false;">${i}</a></li>`;
        }
    }
    if (currentRentalsPage < totalPages) {
        html += `<li><a href="#" onclick="goToRentalsPage(${currentRentalsPage + 1});return false;">></a></li>`;
    }
    html += '</ul>';
    paginationRentals.innerHTML = html;
}

window.goToRentalsPage = function (page) {
    currentRentalsPage = page;
    fetchRentalsBusqueda(page);
};

// Fetch rentals con filtros
function fetchRentalsBusqueda(page = 1) {
    const params = getSearchRentalsParams();
    let url = new URL(ENDPOINT_SEARCH_RENTALS);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', perPageRentals);

    if (params.dni) url.searchParams.append('dni', params.dni);
    if (params.city) url.searchParams.append('city', params.city);
    if (params.province) url.searchParams.append('province', params.province);
    if (params.sin_entrega_llave === 'true') url.searchParams.append('sin_entrega_llave', 'true');
    if (params.sin_devolucion_llave === 'true') url.searchParams.append('sin_devolucion_llave', 'true');

    fetch(url)
        .then(async res => {
            if (!res.ok) {
                let errorMsg = res.statusText || 'Error al cargar los alquileres';
                try {
                    const data = await res.json();
                    if (data && data.error) errorMsg = data.error;
                } catch { }
                throw new Error(errorMsg);
            }
            return res.json();
        })
        .then(data => {
            if (!data.rentals || data.rentals.length === 0) {
                document.getElementById("listaAlquileresActivos").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
                document.getElementById("listaAlquileresCancelados").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
                document.getElementById("listaAlquileresFinalizados").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
            } else {
                renderRentalsTabs(data.rentals);
            }
        })
        .catch(err => {
            document.getElementById("listaAlquileresActivos").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
            document.getElementById("listaAlquileresCancelados").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
            document.getElementById("listaAlquileresFinalizados").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
        });
}

// Renderiza los rentals en los tres listados (activos, cancelados, finalizados)
function renderRentalsTabs(rentals) {
    // Separar por status
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const activos = rentals.filter(r =>
        r.status === 'activo' &&
        r.fecha_tentativa_salida &&
        new Date(r.fecha_tentativa_salida) >= hoy
    );
    const cancelados = rentals.filter(r => r.status === 'cancelado');
    const finalizados = rentals.filter(r =>
        r.status === 'finalizado' ||
        (r.status !== 'cancelado' &&
            r.fecha_tentativa_salida &&
            new Date(r.fecha_tentativa_salida) < hoy)
    );

    renderActivos(activos);
    renderCancelados(cancelados);
    renderFinalizados(finalizados);
}

function fetchRentalsBusqueda(page = 1) {
    const params = getSearchRentalsParams();
    let url = new URL(ENDPOINT_SEARCH_RENTALS);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', perPageRentals);

    if (params.dni) url.searchParams.append('dni', params.dni);
    if (params.city) url.searchParams.append('city', params.city);
    if (params.province) url.searchParams.append('province', params.province);
    if (params.sin_entrega_llave === 'true') url.searchParams.append('sin_entrega_llave', 'true');
    if (params.sin_devolucion_llave === 'true') url.searchParams.append('sin_devolucion_llave', 'true');

    fetch(url)
        .then(async res => {
            if (!res.ok) {
                let errorMsg = res.statusText || 'Error al cargar los alquileres';
                try {
                    const data = await res.json();
                    if (data && data.error) errorMsg = data.error;
                } catch { }
                throw new Error(errorMsg);
            }
            return res.json();
        })
        .then(data => {
            if (!data.rentals || data.rentals.length === 0) {
                document.getElementById("listaAlquileresActivos").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
                document.getElementById("listaAlquileresCancelados").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
                document.getElementById("listaAlquileresFinalizados").innerHTML =
                    `<div class="col-12"><div class="alert alert-info text-center" role="alert">${data.message || 'No hay alquileres cargados actualmente.'}</div></div>`;
            } else {
                renderRentalsTabs(data.rentals);
            }
        })
        .catch(err => {
            document.getElementById("listaAlquileresActivos").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
            document.getElementById("listaAlquileresCancelados").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
            document.getElementById("listaAlquileresFinalizados").innerHTML =
                `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.<br>${err.message}</div></div>`;
        });
}

// Submit del formulario de búsqueda
document.getElementById('search-rentals-form').addEventListener('submit', function (e) {
    e.preventDefault();
    currentRentalsPage = 1;
    fetchRentalsBusqueda(1);
});

const style = document.createElement('style');
style.innerHTML = `
    #listaPropiedades {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        padding: 20px;
    }
    .col-md-4 {
        flex: 0 1 400px; 
        max-width: 400px;
    }
    .property-wrap {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: transform 0.3s ease;
        width: 400px; 
        height: 420px;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
    }
    .property-wrap:hover {
        transform: translateY(-5px);
    }
    .img {
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center;
        display: block;
    }
    .text {
        padding: 15px;
        text-align: center;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .price {
        font-size: 1.2rem;
        color: #e74c3c;
        margin-bottom: 10px;
    }
    .property_list {
        list-style: none;
        padding: 0;
        margin: 0 0 10px;
        display: flex;
        justify-content: center;
    }
    .property_list li {
        margin: 0 10px;
        font-size: 1rem;
        color: #7f8c8d;
    }
    h3 {
        font-size: 1.25rem;
        margin: 0 0 10px;
    }
    h3 a {
        color: #2c3e50;
        text-decoration: none;
    }
    h3 a:hover {
        color: #3498db;
    }
    .location {
        display: block;
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-bottom: 10px;
    }
    .btn-custom {
        background: #3498db;
        color: #fff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        text-align: center;
        line-height: 40px;
    }
    .btn-custom:hover {
        background: #2980b9;
    }
    #pagination {
        display: flex;
        justify-content: center;
        margin-top: 20px;
    }
    #pagination ul {
        display: flex;
        list-style: none;
        padding: 0;
    }
    #pagination li {
        margin: 0 5px;
    }
    #pagination a, #pagination span {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-decoration: none;
        color: #3498db;
    }
    #pagination .active span {
        background: #3498db;
        color: #fff;
        border-color: #3498db;
    }
    #pagination a:hover {
        background: #f5f5f5;
    }
`;
document.head.appendChild(style);

// Agregar un poco de estilo para los botones
const styleKeyButtons = document.createElement('style');
styleKeyButtons.innerHTML = `
    .btn-sm {
        margin-right: 5px;
        margin-bottom: 5px;
    }
    .alert.py-1 {
        padding-top: 0.25rem !important;
        padding-bottom: 0.25rem !important;
        margin-bottom: 0.5rem !important;
        font-size: 0.875rem;
    }
    .gap-2 {
        gap: 0.5rem !important;
    }
    .d-flex.flex-wrap {
        display: flex !important;
        flex-wrap: wrap !important;
    }
`;
document.head.appendChild(styleKeyButtons);

document.getElementById('btnLimpiarFiltrosPropiedades').addEventListener('click', function () {
    document.getElementById('search-form').reset();

    const citySelect = document.getElementById('city');
    if (citySelect) {
        citySelect.innerHTML = '<option value="" disabled selected>Seleccione una ciudad</option>';
    }

    if (window.$) {
        $('#search-date-in').datepicker('clearDates');
        $('#search-date-out').datepicker('clearDates');
    }
});

document.getElementById('btnLimpiarFiltrosRentals').addEventListener('click', function () {
    document.getElementById('search-rentals-form').reset();

    const citySelect = document.getElementById('search-city');
    if (citySelect) {
        citySelect.innerHTML = '<option value="" selected>Cualquiera</option>';
    }

    const provinceSelect = document.getElementById('search-province');
    if (provinceSelect) {
        provinceSelect.value = '';
    }
});

// Agregar las nuevas funciones al objeto window para que estén disponibles globalmente
window.registrarEntregaLlave = registrarEntregaLlave;
window.registrarDevolucionLlave = registrarDevolucionLlave;