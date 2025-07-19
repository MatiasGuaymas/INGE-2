const propertyList = document.getElementById('property-list');
const pagination = document.getElementById('pagination');
let currentPage = 1;
const perPage = 9;
let totalProperties = 0;

document.getElementById('search-form').addEventListener('submit', function (e) {
  e.preventDefault();
  currentPage = 1;
  fetchProperties();
});

// Obtiene los parámetros de búsqueda del formulario (agrega más si tienes más inputs)
function getSearchParams() {
  return {
    address: document.getElementById('search-address')?.value.trim(),
    address_number: document.getElementById('search-address-number')?.value.trim(),
    property_name: document.getElementById('search-property-name')?.value.trim(),
    price_per_night: document.getElementById('search-price')?.value.trim(),
    capacity: document.getElementById('search-capacity')?.value.trim(),
    floor: document.getElementById('search-floor')?.value.trim(),
    department: document.getElementById('search-department')?.value.trim(),
    city: document.getElementById('search-city')?.value.trim(),
    province: document.getElementById('search-province')?.value.trim()
  };
}

function renderProperties(properties) {
  propertyList.innerHTML = '';
  if (!properties || properties.length === 0) {
    propertyList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info text-center" role="alert">
          No hay propiedades que coincidan con la búsqueda.
        </div>
      </div>
    `;
    return;
  }
  properties.forEach(prop => {
    const imgSrc = prop.image_url ? `http://localhost:5000${prop.image_url}` : 'http://localhost:5000/property_images/default.jpg';
    propertyList.innerHTML += `
      <div class="col-12 col-sm-6 col-lg-4 mb-4 d-flex align-items-stretch">
        <div class="card shadow-sm w-100">
          <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor)}&property_department=${encodeURIComponent(prop.department)}" class="text-decoration-none">
            <div class="card-img-top" style="height:200px; background-size:cover; background-position:center; background-image:url('${imgSrc}'); border-top-left-radius: .25rem; border-top-right-radius: .25rem;"></div>
          </a>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-2">${prop.property_name}</h5>
            <span class="location text-muted mb-2">${prop.city}, ${prop.province}</span>
            <ul class="property_list list-inline mb-2">
              <li class="list-inline-item"><span class="flaticon-bed"></span> ${prop.capacity} personas</li>
            </ul>
            <p class="price mb-2"><span class="orig-price">$${prop.price_per_night}<small>/noche</small></span></p>
            <a href="/views/properties-single.html?address=${encodeURIComponent(prop.address)}&address_number=${prop.address_number}&property_city=${encodeURIComponent(prop.city)}&property_province=${encodeURIComponent(prop.province)}&property_floor=${encodeURIComponent(prop.floor)}&property_department=${encodeURIComponent(prop.department)}" class="btn btn-primary mt-auto">Ver detalle</a>
          </div>
        </div>
      </div>
    `;
  });
}

function renderPagination(total) {
  if (!pagination) return;
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

function fetchProperties() {
  const params = getSearchParams();
  let url = new URL('http://localhost:5000/searchProperty');
  url.searchParams.set('page', currentPage);
  url.searchParams.set('per_page', perPage);

  // Solo agrega los campos que tienen valor
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

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
      renderProperties(data.properties, data.image_urls);
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

// Cargar todas las propiedades al inicio (sin filtros)
document.addEventListener('DOMContentLoaded', fetchProperties);

// Exponer la función para paginación
window.goToPage = goToPage;