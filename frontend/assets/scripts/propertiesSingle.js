const publicKey = 'APP_USR-9e9fcfad-321c-4047-a586-3507647659d5';
const mp = new MercadoPago(publicKey);
const BASE_NGROK_URL = 'https://inspired-gecko-relieved.ngrok-free.app';

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const address = getQueryParam('address');
const address_number = getQueryParam('address_number');
const property_city = getQueryParam('property_city');
const property_province = getQueryParam('property_province');
const property_floor = getQueryParam('property_floor');
const property_department = getQueryParam('property_department');
const reservaSection = document.getElementById('reserva-section');
const username = sessionStorage.getItem('username');
const price_per_night = getQueryParam('price_per_night');
const on_maintenance = getQueryParam('on_maintenance');

// Renderizar detalles de la propiedad y galería
if (!address || !address_number || !property_city || !property_province || !property_floor || !property_department) {
  document.getElementById('property-details').innerHTML = `
    <div class="alert alert-danger text-center">Propiedad no encontrada.</div>
  `;
} else {
  fetch(`http://localhost:5000/api/property?address=${encodeURIComponent(address)}&address_number=${address_number}&property_city=${encodeURIComponent(property_city)}&property_province=${encodeURIComponent(property_province)}&property_floor=${encodeURIComponent(property_floor)}&property_department=${encodeURIComponent(property_department)}&price_per_night=${encodeURIComponent(price_per_night)}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.property) {
        document.getElementById('property-details').innerHTML = `
          <div class="alert alert-danger text-center">Propiedad no encontrada.</div>
        `;
        return;
      }
      const prop = data.property;
      const imageUrls = prop.image_urls && prop.image_urls.length > 0 ? prop.image_urls : ["/property_images/default.jpg"];
      let currentImgIdx = 0;

      function renderGallery() {
        const propertyDetails = document.getElementById('property-details');
        const imgSrc = `http://localhost:5000${imageUrls[currentImgIdx]}`;
        let leftArrow = '';
        let rightArrow = '';
        if (imageUrls.length > 1) {
          leftArrow = `<button id="img-prev" type="button" class="btn btn-light btn-sm position-absolute" style="top:50%;left:10px;z-index:2;"><i class="bi bi-chevron-left"></i></button>`;
          rightArrow = `<button id="img-next" type="button" class="btn btn-light btn-sm position-absolute" style="top:50%;right:10px;z-index:2;"><i class="bi bi-chevron-right"></i></button>`;
        }
        propertyDetails.innerHTML = `
          <div class="img position-relative" style="background-image: url('${imgSrc}'); height: 400px; background-size: cover; background-position: center;">
            ${leftArrow}
            ${rightArrow}
            <div class="position-absolute bg-dark text-white px-2 py-1" style="bottom:10px;right:10px;border-radius:6px;font-size:0.9em;opacity:0.8;">${currentImgIdx + 1}/${imageUrls.length}</div>
          </div>
          <div class="text text-center">
            <span class="subheading">${prop.city}</span>
            <h2 id="property-name">${prop.property_name}</h2>
          </div>
          <div class="row">
            <div class="col-md-12 pills">
              <div class="bd-example bd-example-tabs">
                <div class="d-flex justify-content-center">
                  <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                    <li class="nav-item">
                      <a class="nav-link active" id="pills-description-tab" data-toggle="pill"
                        href="#pills-description" role="tab" aria-controls="pills-description"
                        aria-expanded="true">Características</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="pills-manufacturer-tab" data-toggle="pill"
                        href="#pills-manufacturer" role="tab" aria-controls="pills-manufacturer"
                        aria-expanded="true">Descripción</a>
                    </li>
                  </ul>
                </div>
                <div class="tab-content" id="pills-tabContent">
                  <div class="tab-pane fade show active" id="pills-description" role="tabpanel"
                    aria-labelledby="pills-description-tab">
                    <div class="row">
                      <div class="col-md-4">
                        <ul class="features">
                          <li class="check" id="property-address"><span class="ion-ios-checkmark"></span>Dirección: ${prop.address} ${prop.address_number}</li>
                          <li class="check"><span class="ion-ios-checkmark"></span>Ciudad: ${prop.city}</li>
                          <li class="check"><span class="ion-ios-checkmark"></span>Provincia: ${prop.province}</li>
                        </ul>
                      </div>
                      <div class="col-md-4">
                        <ul class="features">
                          <li class="check"><span class="ion-ios-checkmark"></span>Capacidad: ${prop.capacity} personas</li>
                          <li class="check" id="property-price-per-night"><span class="ion-ios-checkmark"></span>Precio por noche: $${prop.price_per_night}</li>
                        </ul>
                      </div>
                      <div class="col-md-4">
                        <ul class="features">
                          <li class="check"><span class="ion-ios-checkmark"></span>Nombre: ${prop.property_name}</li>
                          <li class="check"><span class="ion-ios-checkmark"></span>Política: ${traducirPolitica(prop.politica_de_cancelacion)}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div class="tab-pane fade" id="pills-manufacturer" role="tabpanel"
                    aria-labelledby="pills-manufacturer-tab">
                    <p>Propiedad "${prop.property_name}" ubicada en ${prop.address} ${prop.address_number}, ${prop.city}, ${prop.province}. Capacidad para ${prop.capacity} personas. Precio por noche: $${prop.price_per_night}.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mb-2">${renderStars(prop.average_rating)}</div>
        `;
        // Agregar el botón de calificaciones fuera del innerHTML anterior para evitar perder listeners
        const califDiv = document.createElement('div');
        califDiv.className = 'text-center mb-3';
        califDiv.innerHTML = '<button class="btn btn-outline-primary" id="btnVerCalificaciones">Ver calificaciones</button>';
        propertyDetails.appendChild(califDiv);
        // Listeners de carrusel
        if (imageUrls.length > 1) {
          const prevBtn = document.getElementById('img-prev');
          const nextBtn = document.getElementById('img-next');
          if (prevBtn) prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            currentImgIdx = (currentImgIdx - 1 + imageUrls.length) % imageUrls.length;
            renderGallery();
          });
          if (nextBtn) nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            currentImgIdx = (currentImgIdx + 1) % imageUrls.length;
            renderGallery();
          });
        }
        // Listener de calificaciones
        const btnVerCalificaciones = document.getElementById('btnVerCalificaciones');
        if (btnVerCalificaciones) btnVerCalificaciones.addEventListener('click', cargarCalificaciones);
        mostrarMapa(prop.address, prop.address_number, prop.city, prop.province);
      }
      renderGallery();
    })
    .catch(() => {
      document.getElementById('property-details').innerHTML = `
        <div class="alert alert-danger text-center">Error al cargar la propiedad.</div>
      `;
    });
}

// ----- MOSTRAR CALIFICACIONES -----
async function cargarCalificaciones() {
  const address = getQueryParam('address');
  const address_number = getQueryParam('address_number');
  const property_city = getQueryParam('property_city');
  const property_province = getQueryParam('property_province');
  const property_floor = getQueryParam('property_floor');
  const property_department = getQueryParam('property_department');

  const params = new URLSearchParams({
    property_address: address,
    property_address_number: address_number,
    property_floor: property_floor,
    property_department: property_department,
    property_city: property_city,
    property_province: property_province
  });

  try {
    const res = await fetch(`http://localhost:5000/property/ratings?${params}`);
    let ratings = [];
    if (res.ok) {
      ratings = await res.json();
    } else {
      const data = await res.json();
      Swal.fire({
        title: 'Calificaciones',
        html: `<div class="alert alert-info text-center">${data.message || 'Aún no hay calificaciones para esta propiedad.'}</div>`,
        width: 600,
        showCloseButton: true,
        showConfirmButton: false
      });
      return;
    }

    let html = '';
    if (!ratings || ratings.length === 0) {
      html = '<div class="alert alert-info text-center">Aún no hay calificaciones para esta propiedad.</div>';
    } else {
      html = '<ul class="list-group">';
      ratings.forEach(r => {
        html += `<li class="list-group-item">
          <strong>${r.tenant_username}</strong> - ${renderStars(r.rating)}
          ${r.comment ? `<br><span>${r.comment}</span>` : ''}
        </li>`;
      });
      html += '</ul>';
    }

    Swal.fire({
      title: 'Calificaciones',
      html: html,
      width: 600,
      showCloseButton: true,
      showConfirmButton: false
    });
  } catch (e) {
    Swal.fire({
      title: 'Error',
      text: 'No se pudieron cargar las calificaciones.',
      icon: 'error'
    });
  }
}

// Renderizar formulario de reserva solo si es cliente autenticado
document.addEventListener('DOMContentLoaded', function () {
  const userRole = sessionStorage.getItem('userRole');
  const userLogged = sessionStorage.getItem('userLogged');

  if (on_maintenance === 'true') {
    reservaSection.innerHTML = `
      <div class="alert alert-warning text-center mt-4">
        Esta propiedad está en mantenimiento y no se puede reservar temporalmente.
      </div>
    `;
    return;
  }
  if (userLogged === 'true' && userRole === 'tenant') {
    reservaSection.innerHTML = `
      <div class="card mt-4">
        <div class="card-body">
          <h5 class="card-title">Reservar esta propiedad</h5>
          <form id="formReserva">
            <div class="row">
              <div class="col-md-4 mb-3">
                <label for="checkin" class="form-label">Fecha de ingreso</label>
                <input type="text" class="form-control" id="checkin" name="checkin" autocomplete="off" required>
              </div>
              <div class="col-md-4 mb-3">
                <label for="checkout" class="form-label">Fecha de egreso</label>
                <input type="text" class="form-control" id="checkout" name="checkout" autocomplete="off" required>
              </div>
              <div class="col-md-4 mb-3">
                <label for="cantidadPersonas" class="form-label">Cantidad de personas</label>
                <input type="number" class="form-control" id="cantidadPersonas" name="cantidadPersonas" min="1" required>
              </div>
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" id="btnReservar" disabled>
                Realizar reserva
              </button>            
            </div>
            <div id="mensajeReserva" class="mt-2"></div>
          </form>
        </div>
      </div>
    `;
    inicializarReserva();
  } else {
    reservaSection.innerHTML = `
      <div class="alert alert-info text-center mt-4">
        Debes iniciar sesión como cliente para reservar esta propiedad.
      </div>
    `;
  }
});

function inicializarReserva() {
  let capacidadPropiedad = 1;
  let fechasOcupadas = [];

  // Traer la capacidad de la propiedad
  fetch(`http://localhost:5000/api/property?address=${encodeURIComponent(address)}&address_number=${address_number}&property_city=${encodeURIComponent(property_city)}&property_province=${encodeURIComponent(property_province)}&property_floor=${encodeURIComponent(property_floor)}&property_department=${encodeURIComponent(property_department)}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.property && data.property.capacity) {
        capacidadPropiedad = parseInt(data.property.capacity);
        document.getElementById('cantidadPersonas').max = capacidadPropiedad;
      }
    });

  // Traer fechas ocupadas
  fetch(`http://localhost:5000/rentals/booked-dates?address=${encodeURIComponent(address)}&address_number=${address_number}&property_city=${encodeURIComponent(property_city)}&property_province=${encodeURIComponent(property_province)}&property_floor=${encodeURIComponent(property_floor)}&property_department=${encodeURIComponent(property_department)}`)
    .then(res => res.json())
    .then(data => {
      fechasOcupadas = data.fechas || [];
      inicializarDatepickers();
    });

  function inicializarDatepickers() {
    $('#checkin').datepicker({
      format: 'yyyy-mm-dd',
      startDate: new Date(),
      autoclose: true,
      todayHighlight: true,
      beforeShowDay: function (date) {
        const fechaStr = date.toISOString().split('T')[0];
        if (fechasOcupadas.includes(fechaStr)) {
          return { enabled: false, classes: 'fecha-ocupada', tooltip: 'Ocupada' };
        }
        return true;
      }
    }).on('changeDate', function (e) {
      $('#checkout').datepicker('setStartDate', e.date);
      validarFormulario();
    });

    $('#checkout').datepicker({
      format: 'yyyy-mm-dd',
      startDate: new Date(),
      autoclose: true,
      todayHighlight: true,
      beforeShowDay: function (date) {
        const fechaStr = date.toISOString().split('T')[0];
        if (fechasOcupadas.includes(fechaStr)) {
          return { enabled: false, classes: 'fecha-ocupada', tooltip: 'Ocupada' };
        }
        return true;
      }
    }).on('changeDate', function () {
      validarFormulario();
    });
  }

  function validarFormulario() {
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const cantidad = parseInt(document.getElementById('cantidadPersonas').value);
    const btn = document.getElementById('btnReservar');
    let valido = true;
    let mensaje = '';

    if (!checkin || !checkout) valido = false;
    if (checkin && checkout) {
      const fechaIn = new Date(checkin);
      const fechaOut = new Date(checkout);
      if (fechaIn >= fechaOut) {
        valido = false;
        mensaje = 'La fecha de egreso debe ser posterior a la de ingreso. La reserva debe ser mínimo de un día.';
      }
    }
    if (!cantidad || cantidad < 1 || cantidad > capacidadPropiedad) {
      valido = false;
      mensaje = 'La cantidad de personas debe ser válida.';
    }
    btn.disabled = !valido;
    document.getElementById('mensajeReserva').textContent = mensaje;
    return valido;
  }

  document.getElementById('cantidadPersonas').addEventListener('input', validarFormulario);
  document.getElementById('checkin').addEventListener('change', validarFormulario);
  document.getElementById('checkout').addEventListener('change', validarFormulario);

  // Enviar reserva solo si el pago fue exitoso
  document.getElementById('formReserva').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    // Verificar autenticación
    const username = sessionStorage.getItem('username');
    if (!username) {
      Swal.fire({
        title: 'Error!',
        text: 'Debes iniciar sesión como cliente.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      window.location.href = '/views/logIn.html';
      return;
    }

    const cantidad = parseInt(document.getElementById('cantidadPersonas').value);

    // Verificar disponibilidad
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    let fechasOcupadasActual = [];
    try {
      const res = await fetch(`http://localhost:5000/rentals/booked-dates?address=${encodeURIComponent(address)}&address_number=${address_number}`);
      const data = await res.json();
      fechasOcupadasActual = data.fechas || [];
    } catch {
      alert('No se pudo verificar la disponibilidad.');
      return;
    }
    let fechaIn = new Date(checkin);
    let fechaOut = new Date(checkout);
    let disponible = true;
    for (let d = new Date(fechaIn); d < fechaOut; d.setDate(d.getDate() + 1)) {
      const fechaStr = d.toISOString().split('T')[0];
      if (fechasOcupadasActual.includes(fechaStr)) {
        disponible = false;
        break;
      }
    }
    if (!disponible) {
      Swal.fire({
        title: 'Error!',
        text: 'Las fechas seleccionadas no están disponibles.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    const pagoExitoso = await pagarConMp(checkin, checkout, cantidad);
    if (!pagoExitoso) return;
  });
}

// Mercado Pago: solo retorna true si el pago fue aprobado
async function pagarConMp(checkin, checkout, cantidad) {
  try {
    const name = document.getElementById('property-name').innerText;
    const priceText = document.getElementById('property-price-per-night').innerText.trim().replace(/[^0-9.,]/g, '').replace(',', '.');
    const price_per_night = parseFloat(priceText);
    const noches = Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const total = noches * price_per_night;

    if (isNaN(price_per_night) || total <= 0) {
      alert('El precio o las fechas no son válidas.');
      return false;
    }

    // ALERTA antes de Mercado Pago
    const confirm = await Swal.fire({
      title: 'Confirmar pago',
      html: `<div class="mb-2">Vas a pagar <b>${noches}</b> noche(s) x <b>$${price_per_night.toLocaleString('es-AR')}</b> = <span class="fw-bold text-success" style="font-size:1.3em;">$${total.toLocaleString('es-AR')}</span></div>¿Deseas continuar con el pago?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, pagar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return false;

    const response = await fetch(`${BASE_NGROK_URL}/create_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(({
        title: name,
        description: `Reserva del ${checkin} al ${checkout}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: total,
        property_address: address,
        address_number: address_number,
        city: property_city,
        province: property_province,
        floor: property_floor,
        department: property_department,
        cantidad_personas: cantidad,
        username: username,
        checkin: checkin,
        checkout: checkout
      }))
    });

    const preference = await response.json();
    return new Promise((resolve) => {
      mp.checkout({
        preference: { id: preference.id },
        autoOpen: true,
        onSubmit: async (result) => {
          if (result.status === 'approved') {
            resolve(true);
          } else {
            alert('El pago no fue aprobado.');
            resolve(false);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error al crear la preferencia:', error);
    alert('Error al iniciar el pago.');
    return false;
  }
}

// Mostrar el mapa de Google Maps con la dirección de la propiedad
function mostrarMapa(address, address_number, city, province) {
  const fullAddress = `${address} ${address_number}, ${city}, ${province}, Argentina`;
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: fullAddress }, function (results, status) {
    if (status === 'OK' && results[0]) {
      const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: results[0].geometry.location
      });
      new google.maps.Marker({
        map: map,
        position: results[0].geometry.location
      });
      document.getElementById('map').style.display = 'block';
      document.getElementById('map-error').style.display = 'none';
    } else {
      document.getElementById('map').style.display = 'none';
      document.getElementById('map-error').style.display = 'block';
      document.getElementById('map-error').textContent = 'No se pudo encontrar la dirección en Google Maps.';
    }
  });
}

// ------------- Preguntas y respuestas de la propiedad -------------

function cargarPreguntasRespuestas() {
  const contenedor = document.getElementById('preguntas-respuestas-section');
  contenedor.innerHTML = '<div class="text-center">Cargando preguntas...</div>';

  fetch(`http://localhost:5000/property/questions?property_address=${encodeURIComponent(address)}&property_address_number=${address_number}&property_floor=${property_floor}&property_department=${property_department}&property_city=${property_city}&property_province=${property_province}`)
    .then(res => res.json())
    .then(preguntas => {
      if (!preguntas || preguntas.length === 0) {
        contenedor.innerHTML = `<div class="alert alert-info text-center">Aún no hay preguntas para esta propiedad.</div>`;
        return;
      }

      const userRole = sessionStorage.getItem('userRole');
      const userLogged = sessionStorage.getItem('userLogged');
      const username = sessionStorage.getItem('username');

      let html = '<h5>Preguntas y respuestas</h5><ul class="list-group">';
      preguntas.forEach(q => {
        let borrarPregunta = '';
        if (userLogged === 'true' && (userRole === 'employee' || userRole === 'manager')) {
          borrarPregunta = `<button class="btn btn-sm btn-outline-danger ms-2 btnBorrarPregunta" data-question-id="${q.id}" title="Eliminar pregunta"><i class="bi bi-trash"></i></button>`;
        }

        html += `<li class="list-group-item">
          <strong>${q.tenant_username}</strong> preguntó: <span>${q.question_text}</span> ${borrarPregunta}<br>
          <small class="text-muted">${q.created_at}</small>`;

        if (q.answer) {
          let borrarRespuesta = '';
          if (userLogged === 'true' && (userRole === 'employee' || userRole === 'manager')) {
            borrarRespuesta = `<button class="btn btn-sm btn-outline-danger ms-2 btnBorrarRespuesta" data-answer-id="${q.answer.id}" title="Eliminar respuesta"><i class="bi bi-trash"></i></button>`;
          }
          html += `<div class="mt-2"><strong>Respuesta:</strong> ${q.answer.answer_text} ${borrarRespuesta}<br><small class="text-muted">Empleado - ${q.answer.created_at}</small></div>`;
        }

        html += mostrarFormularioRespuesta(q);
        html += `</li>`;
      });
      html += '</ul>';
      contenedor.innerHTML = html;
    });
}

// Función para mostrar el formulario de respuesta solo si corresponde
function mostrarFormularioRespuesta(q) {
  const userRole = sessionStorage.getItem('userRole');
  const userLogged = sessionStorage.getItem('userLogged');
  const username = sessionStorage.getItem('username');
  // Solo empleados/gerentes pueden responder, solo si no hay respuesta aún
  if (userLogged === 'true' && (userRole === 'employee' || userRole === 'manager') && !q.answer) {
    return `
      <form class="formRespuesta mt-2" data-question-id="${q.id}">
        <div class="input-group">
          <input type="text" class="form-control" placeholder="Escribe tu respuesta...">
          <button class="btn btn-success" type="submit">Responder</button>
        </div>
        <div class="mensajeRespuesta mt-1"></div>
      </form>
    `;
  }
  return '';
}

// Controlar visibilidad de formularios según el rol
function controlarFormularios() {
  const userRole = sessionStorage.getItem('userRole');
  const userLogged = sessionStorage.getItem('userLogged');
  document.getElementById('property-question-section').style.display = (userLogged === 'true' && userRole === 'tenant') ? 'block' : 'none';
  document.getElementById('property-answer-section').style.display = 'none'; // El de respuesta se maneja por pregunta
  if (!userLogged || userLogged !== 'true') {
    document.getElementById('preguntas-respuestas-section').innerHTML = `<div class="alert alert-warning text-center">Debes iniciar sesión para ver y participar en preguntas y respuestas.</div>`;
  }
}

// Responder preguntas
document.addEventListener('submit', async function (e) {
  if (e.target.classList.contains('formRespuesta')) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const answerText = input.value.trim();
    const questionId = e.target.getAttribute('data-question-id');
    const username = sessionStorage.getItem('username');
    if (!answerText) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La respuesta no puede estar vacía.'
      });
      return;
    }

    // Confirmación antes de enviar
    const confirm = await Swal.fire({
      title: '¿Enviar respuesta?',
      text: 'No se puede editar la respuesta una vez enviada. ¿Estás seguro?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
      const resp = await fetch('http://localhost:5000/property/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          answer_text: answerText,
          employee_username: username
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        cargarPreguntasRespuestas();
        Swal.fire({
          icon: 'success',
          title: '¡Respuesta enviada!',
          text: 'Tu respuesta fue enviada correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error || 'Error al enviar la respuesta.'
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al enviar la respuesta.'
      });
    }
  }
});

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', function () {
  controlarFormularios();
  cargarPreguntasRespuestas();

  // Formulario de pregunta solo para tenants logueados
  const form = document.getElementById('formPropertyQuestion');
  // --- Enviar pregunta con confirmación ---
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const mensaje = document.getElementById('mensajePregunta');
      mensaje.textContent = '';
      mensaje.className = '';

      const questionText = document.getElementById('questionText').value.trim();
      const username = sessionStorage.getItem('username');
      const userRole = sessionStorage.getItem('userRole');
      if (!username || userRole !== 'tenant') {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'Debes iniciar sesión como cliente para preguntar.'
        });
        return;
      }
      if (!questionText) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'La pregunta no puede estar vacía.'
        });
        return;
      }

      // Confirmación antes de enviar
      const confirm = await Swal.fire({
        title: '¿Enviar pregunta?',
        text: 'No se puede editar la pregunta una vez enviada. ¿Estás seguro?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, enviar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirm.isConfirmed) return;

      const data = {
        property_address: address,
        property_address_number: address_number,
        property_floor: property_floor,
        property_department: property_department,
        property_city: property_city,
        property_province: property_province,
        tenant_username: username,
        question_text: questionText
      };

      try {
        const response = await fetch('http://localhost:5000/property/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const respData = await response.json();
        if (response.ok) {
          form.reset();
          cargarPreguntasRespuestas();
          Swal.fire({
            icon: 'success',
            title: '¡Pregunta enviada!',
            text: 'Tu pregunta fue enviada correctamente.',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          if (response.status === 403 && respData.error && respData.error.toLowerCase().includes('esperar la respuesta')) {
            Swal.fire({
              icon: 'warning',
              title: 'Atención',
              text: respData.error
            });
          } else if (respData.error) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: respData.error
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al enviar la pregunta.'
            });
          }
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al enviar la pregunta.'
        });
      }
    });
  }
});

function renderStars(average) {
  if (average === null || average === undefined) {
    return `<div class="d-flex flex-column align-items-center mb-2">
      <span class="text-muted" style="font-size:1.1em;">Sin calificación</span>
    </div>`;
  }
  let html = '<div class="d-flex justify-content-center align-items-center mb-2" style="gap: 4px;">';
  for (let i = 1; i <= 5; i++) {
    if (average >= i) {
      html += '<i class="bi bi-star-fill text-warning" style="font-size:2em;"></i>';
    } else if (average >= i - 0.5) {
      html += '<i class="bi bi-star-half text-warning" style="font-size:2em;"></i>';
    } else {
      html += '<i class="bi bi-star text-warning" style="font-size:2em;"></i>';
    }
  }
  html += `<span class="ms-3 fw-bold" style="font-size:1.2em;">${average.toFixed(1)}</span></div>`;
  return html;
}

function traducirPolitica(politica) {
  switch (politica) {
    case 'flexible': return 'Flexible';
    case 'moderate': return 'Moderada';
    case 'strict': return 'Estricta';
    default: return politica;
  }
}

// ----- Eliminar preguntas y respuestas -----
document.addEventListener('click', async function (e) {
  // Borrar pregunta
  if (e.target.closest('.btnBorrarPregunta')) {
    const btn = e.target.closest('.btnBorrarPregunta');
    const questionId = btn.getAttribute('data-question-id');
    const username = sessionStorage.getItem('username');
    const userRole = sessionStorage.getItem('userRole');
    if (!questionId || !(userRole === 'employee' || userRole === 'manager')) return;

    const confirm = await Swal.fire({
      title: '¿Eliminar pregunta?',
      text: 'Esto también eliminará la respuesta si existe. ¿Estás seguro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    const resp = await fetch('http://localhost:5000/property/question/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        admin_username: username
      })
    });
    const data = await resp.json();
    if (resp.ok) {
      cargarPreguntasRespuestas();
      Swal.fire('Eliminado', 'La pregunta fue eliminada correctamente.', 'success');
    } else {
      Swal.fire('Error', data.error || 'No se pudo eliminar la pregunta.', 'error');
    }
  }

  // Borrar respuesta
  if (e.target.closest('.btnBorrarRespuesta')) {
    const btn = e.target.closest('.btnBorrarRespuesta');
    const answerId = btn.getAttribute('data-answer-id');
    const username = sessionStorage.getItem('username');
    const userRole = sessionStorage.getItem('userRole');
    if (!answerId || !(userRole === 'employee' || userRole === 'manager')) return;

    const confirm = await Swal.fire({
      title: '¿Eliminar respuesta?',
      text: '¿Estás seguro de que deseas eliminar esta respuesta?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    const resp = await fetch('http://localhost:5000/property/answer/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer_id: answerId,
        admin_username: username
      })
    });
    const data = await resp.json();
    if (resp.ok) {
      cargarPreguntasRespuestas();
      Swal.fire('Eliminado', 'La respuesta fue eliminada correctamente.', 'success');
    } else {
      Swal.fire('Error', data.error || 'No se pudo eliminar la respuesta.', 'error');
    }
  }
});

