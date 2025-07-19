const propertyList = document.getElementById('property-list');
const pagination = document.getElementById('pagination');
let currentPage = 1;
let totalProperties = 0;
let totalPropertiesBD = null;
const perPage = 9;

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

function renderProperties(properties) {
  propertyList.innerHTML = '';
  if (properties.length === 0) {
    let mensaje;
    if (totalPropertiesBD === 0) {
      mensaje = 'No hay propiedades cargadas actualmente.';
    } else {
      mensaje = 'No hay propiedades que coincidan con los filtros de búsqueda seleccionados.';
    }
    propertyList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info text-center" role="alert">
          ${mensaje}
        </div>
      </div>
    `;
    return;
  }
  properties.forEach((prop, idx) => {
    let imgSrc = prop.image_url
      ? `http://localhost:5000/${prop.image_url}`
      : (prop.image_urls && prop.image_urls.length > 0
        ? `http://localhost:5000${prop.image_urls[0]}`
        : `http://localhost:5000/default.jpg`);
    propertyList.innerHTML += `
      <div class="col-md-4" data-aos="fade-up" data-aos-duration="900" data-aos-delay="${100 + idx * 80}">
        <div class="property-wrap ftco-animate">
          <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor)}&property_department=${encodeURIComponent(prop.department)}&price_per_night=${encodeURIComponent(prop.price_per_night)}&on_maintenance=${encodeURIComponent(prop.on_maintenance)}" class="img" style="background:#eee;display:flex;align-items:center;justify-content:center;">
            <img src="${imgSrc}" alt="Imagen propiedad" style="max-width:100%;max-height:100%;object-fit:cover;width:100%;height:200px;" onerror="this.onerror=null;this.src='http://localhost:5000/property_images/default.jpg';">
          </a>
          <div class="text" style="margin-left:35px;">
            <p class="price"><span class="orig-price">$${prop.price_per_night}<small>/noche</small></span></p>
            <div class="mb-2">${renderStars(prop.average_rating)}</div>
            <ul class="property_list" style="flex-direction:column;align-items:center;">
              <li><span class="flaticon-bed"></span>${prop.capacity}</li>
              <li style="display:block;width:100%;text-align:center;margin-top:4px;">
                <strong>Política:</strong> ${traducirPolitica(prop.politica_de_cancelacion)}
              </li>
            </ul>
            <h3><a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor)}&property_department=${encodeURIComponent(prop.department)}" class="truncate-text" title="${prop.property_name}">${prop.property_name}</a></h3>
            <span class="location truncate-text" title="${prop.city}, ${prop.province}">${prop.city}, ${prop.province}</span>
            <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor)}&property_department=${encodeURIComponent(prop.department)}" class="btn btn-primary w-100 mt-2">
              Ver propiedad
            </a>
          </div>
        </div>
      </div>
    `;
  });
  // Re-inicializa AOS después de renderizar
  if (window.AOS) AOS.init();
}

function renderPagination(total) {
  pagination.innerHTML = '';
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return;
  if (currentPage > 1) {
    pagination.innerHTML += `<li><a href="#" onclick="goToPage(${currentPage - 1});return false;"><</a></li>`;
  }
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      pagination.innerHTML += `<li class="active"><span>${i}</span></li>`;
    } else {
      pagination.innerHTML += `<li><a href="#" onclick="goToPage(${i});return false;">${i}</a></li>`;
    }
  }
  if (currentPage < totalPages) {
    pagination.innerHTML += `<li><a href="#" onclick="goToPage(${currentPage + 1});return false;">></a></li>`;
  }
}

function goToPage(page) {
  currentPage = page;
  fetchProperties();
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

function fetchProperties() {
  const params = getSearchParams();
  let url = new URL('http://localhost:5000/searchProperty');
  url.searchParams.set('page', currentPage);
  url.searchParams.set('per_page', perPage);

  // Solo agrega los campos que tienen valor
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
      renderProperties(data.properties);
      totalProperties = data.total;
      renderPagination(totalProperties);
    })
    .catch(err => {
      propertyList.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger text-center" role="alert">
            Error al cargar las propiedades.<br>${err.message}
          </div>
        </div>
      `;
      if (pagination) pagination.innerHTML = '';
    });
}

function fetchTotalPropertiesBD() {
  fetch('http://localhost:5000/searchProperty?page=1&per_page=1')
    .then(res => res.json())
    .then(data => {
      totalPropertiesBD = data.total;
    });
}

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', function () {
  fetchTotalPropertiesBD();
  // Provincias
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

  // Ciudades de la provincia seleccionada
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

  // Inicializar datepickers para búsqueda
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

  fetchProperties();
});

function formatDateToYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  fetchProperties();
});

const style = document.createElement('style');
style.innerHTML = `
  #property-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    padding: 20px;
  }
  .col-md-4 {
    flex: 0 1 300px;
    max-width: 300px;
  }
  .property-wrap {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    overflow: visible; /* permite mostrar todo */
    transition: transform 0.3s ease;
    width: 300px;
    min-height: 420px; /* altura mínima */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
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
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;     /* Centra verticalmente */
    align-items: center;         /* Centra horizontalmente */
    text-align: center;
    gap: 10px;                   /* Espaciado entre elementos */
    flex: 1;
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

// Funcionalidad para limpiar filtros del buscador de propiedades
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