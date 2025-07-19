fetch('https://apis.datos.gob.ar/georef/api/provincias')
    .then(response => response.json())
    .then(data => {
        const select = document.getElementById('province');
        // Ordenar provincias alfabéticamente
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
            // Ordenar ciudades alfabéticamente
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

function getQueryParams() {
    const params = {};
    window.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function (_, key, value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    return params;
}

const params = getQueryParams();
const form = document.getElementById('formEditarPropiedad');
const address = params.address || '';
const address_number = params.address_number || '';
const property_city = params.property_city || '';
const property_province = params.property_province || '';
const property_floor = params.property_floor || '';
const property_department = params.property_department || '';
const price_per_night = params.price_per_night || '';
const on_maintenance = params.property_on_maintenance || 'false';

console.log('Parámetros obtenidos:', params);

if (on_maintenance === 'true') {
    document.getElementById('btnMantenimiento').style.display = 'none';
    document.getElementById('btnOperativa').style.display = '';
} else {
    document.getElementById('btnMantenimiento').style.display = '';
    document.getElementById('btnOperativa').style.display = 'none';
}

let originalValues = {};
let imagenesPropiedad = []; // [{id, url}]
let imagenesIDs = [];
let imagenesAEliminar = [];

// Cargar datos actuales de la propiedad
function cargarDatosPropiedad() {
    fetch(`http://localhost:5000/api/property?address=${encodeURIComponent(address)}&address_number=${address_number}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.property) {
                const prop = data.property;
                form.property_name.value = prop.property_name || '';
                form.address.value = prop.address || '';
                form.address_number.value = prop.address_number || '';
                form.city.value = prop.city || '';
                form.province.value = prop.province || '';
                form.capacity.value = prop.capacity || '';
                form.price_per_night.value = prop.price_per_night || '';
                form.floor.value = (prop.floor !== undefined && prop.floor !== null && prop.floor !== '') ? prop.floor : 0;
                form.department.value = (prop.department !== undefined && prop.department !== null && prop.department !== '') ? prop.department : 'N/A';
                // Guardar valores originales tal como están en la base de datos
                originalValues = {
                    old_address: prop.address,
                    old_address_number: prop.address_number,
                    old_city: prop.city,
                    old_province: prop.province,
                    old_floor: prop.floor,
                    old_department: prop.department,
                    old_capacity: prop.capacity
                };
                // Asociar cada imagen con su ID
                imagenesPropiedad = [];
                const backendUrl = window.location.hostname === "localhost" ? "http://localhost:5000" : `${window.location.protocol}//${window.location.host}`;
                if (Array.isArray(prop.image_filenames) && Array.isArray(prop.image_ids) && prop.image_filenames.length === prop.image_ids.length) {
                    for (let i = 0; i < prop.image_filenames.length; i++) {
                        imagenesPropiedad.push({
                            id: prop.image_ids[i],
                            url: `${backendUrl}/property_images/${prop.image_filenames[i]}`
                        });
                    }
                } else if (Array.isArray(prop.image_urls) && Array.isArray(prop.image_ids) && prop.image_urls.length === prop.image_ids.length) {
                    for (let i = 0; i < prop.image_urls.length; i++) {
                        imagenesPropiedad.push({
                            id: prop.image_ids[i],
                            url: prop.image_urls[i].startsWith('http') ? prop.image_urls[i] : `${backendUrl}${prop.image_urls[i]}`
                        });
                    }
                }
                console.log('Imágenes de la propiedad:', imagenesPropiedad);
                renderCarousel();
            }
        });
}

function renderCarousel() {
    const carouselInner = document.getElementById('carouselInner');
    const carousel = document.getElementById('carouselImagenes');
    carouselInner.innerHTML = '';
    if (imagenesPropiedad.length === 0) {
        carouselInner.innerHTML = '<div class="carousel-item active"><div class="text-center">No hay imágenes</div></div>';
        const prevBtn = document.getElementById('customPrevBtn');
        const nextBtn = document.getElementById('customNextBtn');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }
    imagenesPropiedad.forEach((imgObj, idx) => {
        const activeClass = idx === 0 ? 'active' : '';
        const item = document.createElement('div');
        item.className = `carousel-item ${activeClass}`;
        // Si solo queda una imagen, no mostrar el botón eliminar
        const showDelete = imagenesPropiedad.length > 1;
        item.innerHTML = `
                <div class='d-flex flex-column align-items-center'>
                    <img src="${imgObj.url}" class="d-block" style="max-height:300px; max-width:100%; object-fit:contain;">
                    ${showDelete ? `<button type="button" class="btn btn-danger btn-sm mt-2" onclick="eliminarImagen(${imgObj.id})">Eliminar</button>` : ''}
                </div>
            `;
        carouselInner.appendChild(item);
    });
    const prevBtn = document.getElementById('customPrevBtn');
    const nextBtn = document.getElementById('customNextBtn');
    if (imagenesPropiedad.length > 1) {
        if (prevBtn) prevBtn.style.display = '';
        if (nextBtn) nextBtn.style.display = '';
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }
    if (window.bootstrap && window.bootstrap.Carousel) {
        if (carousel._carouselInstance) {
            carousel._carouselInstance.dispose();
        }
        carousel._carouselInstance = new window.bootstrap.Carousel(carousel, { interval: false, ride: false });
    }
}

// Cambiar a recibir el ID de la imagen
window.eliminarImagen = function (imgId) {
    if (imagenesPropiedad.length <= 1) return; // No permitir eliminar la última imagen
    const imgObj = imagenesPropiedad.find(i => i.id === imgId);
    if (imgObj) {
        imagenesAEliminar.push(imgObj.id);
        imagenesPropiedad = imagenesPropiedad.filter(i => i.id !== imgId);
        renderCarousel();
    }
}

// Guardar cambios
form.addEventListener('submit', function (e) {
    e.preventDefault();
    imagenes = document.getElementById('fotoPropiedad') ? document.getElementById('fotoPropiedad').files : [];

    // Si hay imágenes a eliminar, primero hacer la baja lógica
    if (imagenesAEliminar.length > 0) {
        fetch('http://localhost:5000/delete/property-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_ids: imagenesAEliminar })
        })
            .then(res => res.json())
            .then(data => {
                // Luego de la baja lógica, continuar con la edición de la propiedad
                enviarEdicionPropiedad();
            })
            .catch(() => {
                const msgDiv = document.getElementById('errorMessageEditProperty');
                msgDiv.innerHTML = `<span style='color:red;'>Error al eliminar imágenes</span>`;
            });
    } else {
        enviarEdicionPropiedad();
    }
});

function enviarEdicionPropiedad() {
    const datos = {
        property_name: form.property_name.value.trim(),
        address: form.address.value.trim().toLowerCase(),
        address_number: parseInt(form.address_number.value),
        city: form.city.value.trim().toLowerCase(),
        province: form.province.value.trim().toLowerCase(),
        capacity: parseInt(form.capacity.value),
        price_per_night: parseFloat(form.price_per_night.value),
        floor: form.floor.value !== '' ? parseInt(form.floor.value) : 0,
        department: form.department.value.trim().toLowerCase() || 'n/a',
        imagenes: document.getElementById('fotoPropiedad') ? document.getElementById('fotoPropiedad').files : [],
        ...originalValues
    };
    fetch('http://localhost:5000/edit_property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
        .then(res => res.json())
        .then(data => {
            const msgDiv = document.getElementById('errorMessageEditProperty');
            if (data.message) {
                msgDiv.innerHTML = `<span style='color:green;'>${data.message}</span>`;
                setTimeout(() => {
                    window.location.href = 'editProperty.html';
                }, 1500);
            } else if (data.error) {
                msgDiv.innerHTML = `<span style='color:red;'>Error al actualizar la propiedad: ${data.error}</span>`;
            } else {
                msgDiv.innerHTML = `<span style='color:red;'>Error al actualizar la propiedad</span>`;
            }
        })
        .catch(() => {
            const msgDiv = document.getElementById('errorMessageEditProperty');
            msgDiv.innerHTML = `<span style='color:red;'>Error al actualizar la propiedad</span>`;
        });
}

document.getElementById('btnEliminarPropiedad').addEventListener('click', function () {
    Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas eliminar esta propiedad? Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const datos = {
                address: address,
                address_number: address_number,
                city: property_city.trim().toLowerCase(),
                province: property_province.trim().toLowerCase(),
                floor: property_floor,
                department: property_department.trim().toLowerCase() || 'n/a'
            };
            fetch('http://localhost:5000/delete/property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message) {
                        Swal.fire('Eliminada', data.message, 'success').then(() => {
                            window.location.href = 'editProperty.html';
                        });
                    } else if (data.error) {
                        Swal.fire('Error', `Error al eliminar la propiedad: ${data.error}`, 'error');
                    } else {
                        Swal.fire('Error', 'Error al eliminar la propiedad', 'error');
                    }
                })
                .catch(() => {
                    Swal.fire('Error', 'Error al eliminar la propiedad', 'error');
                });
        }
    });
});

document.getElementById('btnMantenimiento').addEventListener('click', function () {
    Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas poner esta propiedad en mantenimiento?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, poner en mantenimiento',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const datos = {
                address: address,
                address_number: address_number,
                city: property_city.trim().toLowerCase(),
                province: property_province.trim().toLowerCase(),
                floor: property_floor,
                department: property_department.trim().toLowerCase() || 'n/a'
            };
            fetch('http://localhost:5000/assign/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message) {
                        Swal.fire('Mantenimiento', data.message, 'success').then(() => {
                            window.location.href = 'editProperty.html';
                        });
                    } else if (data.error) {
                        Swal.fire('Error', `Error al poner la propiedad en mantenimiento: ${data.error}`, 'error');
                    } else {
                        Swal.fire('Error', 'Error al poner la propiedad en mantenimiento', 'error');
                    }
                })
                .catch(() => {
                    Swal.fire('Error', 'Error al poner la propiedad en mantenimiento', 'error');
                });
        }
    });
});

document.getElementById('btnOperativa').addEventListener('click', function () {
    Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas poner esta propiedad operativa?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, poner operativa',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const datos = {
                address: address,
                address_number: address_number,
                city: property_city.trim().toLowerCase(),
                province: property_province.trim().toLowerCase(),
                floor: property_floor,
                department: property_department.trim().toLowerCase() || 'n/a'
            };
            fetch('http://localhost:5000/assign/operational', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message) {
                        Swal.fire('Operativa', data.message, 'success').then(() => {
                            window.location.href = 'editProperty.html';
                        });
                    } else if (data.error) {
                        Swal.fire('Error', `Error al poner la propiedad operativa: ${data.error}`, 'error');
                    } else {
                        Swal.fire('Error', 'Error al poner la propiedad operativa', 'error');
                    }
                })
                .catch(() => {
                    Swal.fire('Error', 'Error al poner la propiedad operativa', 'error');
                });
        }
    });
});


window.addEventListener('DOMContentLoaded', cargarDatosPropiedad)