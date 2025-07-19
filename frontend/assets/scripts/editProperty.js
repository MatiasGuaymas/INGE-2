// Endpoint para obtener todas las propiedades
const ENDPOINT_PROPIEDADES = 'http://localhost:5000/api/properties';
const grid = document.getElementById('gridPropiedades');

function renderPropiedades(propiedades) {
    grid.innerHTML = '';
    if (!propiedades || propiedades.length === 0) {
        grid.innerHTML = '<p class="text-center">No hay propiedades cargadas.</p>';
        return;
    }
    propiedades.forEach(prop => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${prop.property_name || ''}</h5>
                        <p class="card-text">Dirección: ${prop.address || ''}, ${prop.address_number || ''}</p>
                        <p class="card-text">Ciudad: ${prop.city || ''}</p>
                        <p class="card-text">Provincia: ${prop.province || ''}</p>
                        <p class="card-text">Capacidad: ${prop.capacity || ''}</p>
                        <p class="card-text">Precio por noche: $${prop.price_per_night || ''}</p>
                        <button class="btn btn-primary" onclick="editarPropiedad('${prop.address}', '${prop.address_number}', '${prop.city}', '${prop.province}', '${prop.floor}', '${prop.department}', '${prop.on_maintenance}')">Editar</button>
                    </div>
                </div>
            `;
        grid.appendChild(card);
    });
}

function fetchPropiedades() {
    fetch(ENDPOINT_PROPIEDADES)
        .then(res => res.json())
        .then(data => {
            if (data && data.properties) {
                // Si la respuesta tiene 'properties', úsala
                renderPropiedades(data.properties);
            } else if (data && data.propiedades) {
                // Compatibilidad con 'propiedades'
                renderPropiedades(data.propiedades);
            } else if (Array.isArray(data)) {
                renderPropiedades(data);
            } else {
                grid.innerHTML = '<p class="text-center">No hay propiedades registradas.</p>';
            }
        })
        .catch(err => {
            grid.innerHTML = '<p class="text-center text-danger">Error al cargar propiedades.</p>';
        });
}

function editarPropiedad(address, address_number, city, province, floor, department, on_maintenance) {
    window.location.href = `editPropertyForm.html?address=${encodeURIComponent(address)}&address_number=${encodeURIComponent(address_number)}&property_city=${encodeURIComponent(city)}&property_province=${encodeURIComponent(province)}&property_floor=${encodeURIComponent(floor)}&property_department=${encodeURIComponent(department)}&property_on_maintenance=${encodeURIComponent(on_maintenance)}`;
}

window.addEventListener('DOMContentLoaded', fetchPropiedades);