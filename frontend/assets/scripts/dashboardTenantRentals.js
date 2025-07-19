const ENDPOINT_RENTALS_CANCEL = 'http://localhost:5000/rentals/cancel';

document.addEventListener('DOMContentLoaded', function () {
    const username = sessionStorage.getItem('username');
    const userRole = sessionStorage.getItem('userRole');
    const contActivos = document.getElementById('listaAlquileresActivos');
    const contFinalizados = document.getElementById('listaAlquileresFinalizados');
    const contCancelados = document.getElementById('listaAlquileresCancelados');

    if (!username || userRole !== 'tenant') {
        if (contActivos) contActivos.innerHTML = `<div class="col-12"><div class="alert alert-warning text-center" role="alert">Debes iniciar sesión como cliente para acceder a este apartado.</div></div>`;
        if (contFinalizados) contFinalizados.innerHTML = `<div class="col-12"><div class="alert alert-warning text-center" role="alert">Debes iniciar sesión como cliente para acceder a este apartado.</div></div>`;
        if (contCancelados) contCancelados.innerHTML = `<div class="col-12"><div class="alert alert-warning text-center" role="alert">Debes iniciar sesión como cliente para acceder a este apartado.</div></div>`;
        return;
    }

    function renderActivos(rentals) {
        contActivos.innerHTML = '';
        if (!rentals || rentals.length === 0) {
            contActivos.innerHTML = `<div class="col-12"><div class="alert alert-info text-center" role="alert">No tienes alquileres activos.</div></div>`;
            return;
        }
        rentals.forEach(r => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            card.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title mb-2">
                            <i class="bi bi-house-door-fill"></i> ${r.property_name || '-'}
                        </h5>
                        <p class="card-text mb-1"><strong>Dirección:</strong> ${r.property_address} ${r.property_address_number}, Piso: ${r.property_floor}, Depto: ${r.property_department}, ${r.property_city}, ${r.property_province}</p>
                        <p class="card-text mb-1"><strong>Estado:</strong> <span class="badge badge-success">Activo</span></p>
                        <p class="card-text mb-1"><strong>Fecha inicio tentativa:</strong> ${r.fecha_tentativa_ingreso || '-'}</p>
                        <p class="card-text mb-1"><strong>Fecha fin tentativa:</strong> ${r.fecha_tentativa_salida || '-'}</p>
                        <p class="card-text mb-1"><strong>Personas:</strong> ${r.cantidad_personas || '-'}</p>
                        <p class="card-text mb-1"><strong>Total:</strong> $${r.total || '-'}</p>
                        <p class="card-text mb-1"><strong>Entrega de llave:</strong> ${r.fecha_entrega_llave || '-'}</p>
                        <p class="card-text mb-1"><strong>Devolución de llave:</strong> ${r.fecha_devolucion_llave || '-'}</p>
                        <button class="btn btn-danger btn-sm" ${r.status !== 'activo' ? 'disabled' : ''}>Cancelar reserva</button>
                    </div>
                </div>
            `;
            // Botón cancelar
            const btn = card.querySelector('button');
            btn.addEventListener('click', function () {
                Swal.fire({
                    title: '¿Seguro que deseas cancelar este alquiler?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, cancelar',
                    cancelButtonText: 'No'
                }).then((result) => {
                    if (result.isConfirmed) {
                        fetch(ENDPOINT_RENTALS_CANCEL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rental_id: r.id, username: username })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.message) {
                                    Swal.fire('Cancelado', 'Reserva cancelada', 'success');
                                    loadAll();
                                } else {
                                    Swal.fire('Error', data.error || 'Error al cancelar', 'error');
                                }
                            })
                            .catch(() => {
                                Swal.fire('Error', 'No se pudo cancelar la reserva', 'error');
                            });
                    }
                });
            });
            contActivos.appendChild(card);
        });
    }

    function renderFinalizados(rentals) {
        contFinalizados.innerHTML = '';
        if (!rentals || rentals.length === 0) {
            contFinalizados.innerHTML = `<div class="col-12"><div class="alert alert-info text-center" role="alert">No tienes alquileres finalizados.</div></div>`;
            return;
        }
        rentals.forEach(r => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            card.innerHTML = `
                <div class="card h-100 shadow-sm border-success">
                    <div class="card-body">
                        <h5 class="card-title mb-2">
                            <i class="bi bi-house-door-fill"></i> ${r.property_name || '-'}
                        </h5>
                        <p class="card-text mb-1"><strong>Dirección:</strong> ${r.property_address} ${r.property_address_number}, Piso: ${r.property_floor}, Depto: ${r.property_department}, ${r.property_city}, ${r.property_province}</p>
                        <p class="card-text mb-1"><strong>Estado:</strong> <span class="badge badge-success">Finalizado</span></p>
                        <p class="card-text mb-1"><strong>Fecha inicio tentativa:</strong> ${r.fecha_tentativa_ingreso || '-'}</p>
                        <p class="card-text mb-1"><strong>Fecha fin tentativa:</strong> ${r.fecha_tentativa_salida || '-'}</p>
                        <p class="card-text mb-1"><strong>Personas:</strong> ${r.cantidad_personas || '-'}</p>
                        <p class="card-text mb-1"><strong>Total:</strong> $${r.total || '-'}</p>
                        <p class="card-text mb-1"><strong>Entrega de llave:</strong> ${r.fecha_entrega_llave || '-'}</p>
                        <p class="card-text mb-1"><strong>Devolución de llave:</strong> ${r.fecha_devolucion_llave || '-'}</p>
                        ${r.motivo_devolucion_temprana ? `<div class="alert alert-warning py-1 px-2 my-1"><strong>Motivo de devolución temprana:</strong> ${r.motivo_devolucion_temprana}</div>` : ''}
                        <div class="calificacion-section"></div>
                    </div>
                </div>
            `;
            const calificacionSection = card.querySelector('.calificacion-section');
            // Consultar si ya calificó este alquiler
            fetch(`http://localhost:5000/property/tenant-rating?property_address=${encodeURIComponent(r.property_address)}&property_address_number=${r.property_address_number}&property_floor=${r.property_floor || ''}&property_department=${r.property_department || ''}&property_city=${encodeURIComponent(r.property_city)}&property_province=${encodeURIComponent(r.property_province)}&tenant_username=${username}`)
                .then(async res => {
                    if (res.ok) {
                        const data = await res.json();
                        calificacionSection.innerHTML = `
                            <div class="alert alert-info mt-2">Ya calificaste esta propiedad.<br>
                                <span>${renderStars(data.rating.rating)}</span>
                                ${data.rating.comment ? `<br><em>${data.rating.comment}</em>` : ''}
                            </div>
                        `;
                    } else if (res.status === 404) {
                        calificacionSection.innerHTML = `<button class="btn btn-warning btnCalificar" data-id="${r.id}">Calificar</button>`;
                        const btn = calificacionSection.querySelector('.btnCalificar');
                        btn.addEventListener('click', function () {
                            abrirModalCalificacion(r);
                        });
                    } else {
                        calificacionSection.innerHTML = `<div class="alert alert-warning mt-2">No se pudo verificar la calificación.</div>`;
                    }
                })
                .catch(() => {
                    calificacionSection.innerHTML = `<div class="alert alert-warning mt-2">No se pudo verificar la calificación.</div>`;
                });
            contFinalizados.appendChild(card);
        });
    }

    function renderCancelados(rentals) {
        contCancelados.innerHTML = '';
        if (!rentals || rentals.length === 0) {
            contCancelados.innerHTML = `<div class="col-12"><div class="alert alert-info text-center" role="alert">No tienes reservas canceladas.</div></div>`;
            return;
        }
        rentals.forEach(r => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            card.innerHTML = `
                <div class="card h-100 shadow-sm border-danger">
                    <div class="card-body">
                        <h5 class="card-title mb-2">
                            <i class="bi bi-house-door-fill"></i> ${r.property_name || '-'}
                        </h5>
                        <p class="card-text mb-1"><strong>Dirección:</strong> ${r.property_address} ${r.property_address_number}, Piso: ${r.property_floor}, Depto: ${r.property_department}, ${r.property_city}, ${r.property_province}</p>
                        <p class="card-text mb-1"><strong>Estado:</strong> <span class="badge badge-danger">Cancelada</span></p>
                        <p class="card-text mb-1"><strong>Fecha inicio tentativa:</strong> ${r.fecha_tentativa_ingreso || '-'}</p>
                        <p class="card-text mb-1"><strong>Fecha fin tentativa:</strong> ${r.fecha_tentativa_salida || '-'}</p>
                        <p class="card-text mb-1"><strong>Personas:</strong> ${r.cantidad_personas || '-'}</p>
                        <p class="card-text mb-1"><strong>Total:</strong> $${r.total || '-'}</p>
                    </div>
                </div>
            `;
            contCancelados.appendChild(card);
        });
    }

    function loadAll() {
        fetch(`http://localhost:5000/rentals/tenant/${username}`)
            .then(res => res.json())
            .then(data => {
                // Activos: status === 'activo'
                const activos = data.filter(r => r.status === 'activo');
                // Finalizados: status === 'finalizado'
                const finalizados = data.filter(r => r.status === 'finalizado');
                // Cancelados: status === 'cancelado'
                const cancelados = data.filter(r => r.status === 'cancelado');

                renderActivos(activos);
                renderFinalizados(finalizados);
                renderCancelados(cancelados);
            })
            .catch(() => {
                contActivos.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.</div></div>`;
                contFinalizados.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.</div></div>`;
                contCancelados.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center" role="alert">Error al cargar los alquileres.</div></div>`;
            });
    }

    function abrirModalCalificacion(rental) {
        Swal.fire({
            title: 'Calificar propiedad',
            html: `
                <div class="mb-2">
                    <span id="ratingStars">
                        ${[1, 2, 3, 4, 5].map(i => `<i class="bi bi-star text-warning" data-value="${i}" style="font-size:1.5em;cursor:pointer;"></i>`).join('')}
                    </span>
                    <span id="selectedRating" class="ms-2 text-primary"></span>
                </div>
                <textarea class="form-control mb-2" id="comentarioCalificacion" rows="2" placeholder="Escribe una reseña (opcional)"></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enviar calificación',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const rating = window._selectedRatingValue || 0;
                const comentario = document.getElementById('comentarioCalificacion').value.trim();
                if (rating === 0) {
                    Swal.showValidationMessage('Debes ingresar una calificación.');
                    return false;
                }
                return { rating, comentario };
            },
            didOpen: () => {
                let rating = 0;
                const stars = document.querySelectorAll('#ratingStars i');
                const selectedRating = document.getElementById('selectedRating');
                stars.forEach(star => {
                    star.addEventListener('mouseenter', function () {
                        const val = parseInt(this.getAttribute('data-value'));
                        stars.forEach((s, idx) => {
                            s.className = idx < val ? 'bi bi-star-fill text-warning' : 'bi bi-star text-warning';
                        });
                    });
                    star.addEventListener('mouseleave', function () {
                        stars.forEach((s, idx) => {
                            s.className = idx < rating ? 'bi bi-star-fill text-warning' : 'bi bi-star text-warning';
                        });
                    });
                    star.addEventListener('click', function () {
                        rating = parseInt(this.getAttribute('data-value'));
                        window._selectedRatingValue = rating;
                        selectedRating.textContent = `Calificación: ${rating}`;
                        stars.forEach((s, idx) => {
                            s.className = idx < rating ? 'bi bi-star-fill text-warning' : 'bi bi-star text-warning';
                        });
                    });
                });
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                // Confirmación final
                const confirm = await Swal.fire({
                    title: '¿Enviar calificación?',
                    text: 'No podrás modificar tu calificación luego. ¿Estás seguro?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, enviar',
                    cancelButtonText: 'Cancelar'
                });
                console.log(rental);
                if (!confirm.isConfirmed) return;
                try {
                    const resp = await fetch('http://localhost:5000/property/rating', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            property_address: rental.property_address.trim().toLowerCase(),
                            property_address_number: rental.property_address_number,
                            property_floor: rental.property_floor ?? 0,
                            property_department: (rental.property_department || 'n/a').trim().toLowerCase(),
                            property_city: rental.property_city.trim().toLowerCase(),
                            property_province: rental.property_province.trim().toLowerCase(),
                            tenant_username: username,
                            rating: result.value.rating,
                            comment: result.value.comentario
                        })
                    });
                    const data = await resp.json();
                    if (resp.ok) {
                        Swal.fire('¡Gracias!', 'Tu calificación fue registrada.', 'success');
                        loadAll();
                    } else if (resp.status === 409) {
                        Swal.fire('Error', data.error || 'Ya has calificado esta propiedad.', 'error');
                    } else {
                        Swal.fire('Error', data.error || 'No se pudo registrar la calificación.', 'error');
                    }
                } catch (e) {
                    Swal.fire('Error', 'No se pudo registrar la calificación.', 'error');
                }
            }
        });
    }

    // Utilidad para mostrar estrellas
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

    loadAll();
});