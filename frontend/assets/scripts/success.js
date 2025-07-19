function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const address = getQueryParam('property_address');
const address_number = getQueryParam('property_address_number');
const city = getQueryParam('property_city');
const province = getQueryParam('property_province');
const floor = getQueryParam('property_floor');
const department = getQueryParam('property_department');
const username = getQueryParam('username');
const cantidad_personas = getQueryParam('cantidad_personas');
const checkin = getQueryParam('checkin');
const checkout = getQueryParam('checkout');
const price_per_night = getQueryParam('price_per_night');


async function realizarReserva() {
    const reserva = {
        property_address: address,
        property_address_number: address_number,
        property_city: city,
        property_province: province,
        property_floor: floor,
        property_department: department,
        tenant_username: username,
        fecha_entrega_llave: null,
        fecha_devolucion_llave: null,
        cantidad_personas: cantidad_personas,
        fecha_tentativa_ingreso: checkin,
        fecha_tentativa_salida: checkout,
        total : price_per_night * (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24), // Calcular total en base a las fechas
        };


    try {
        const response = await fetch('http://localhost:5000/cargar/rental', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reserva)
        });
        const respData = await response.json();
        if (!response.ok) {
            console.error(respData.error || 'Error al realizar la reserva');
            return;
        }
        actualizarFechasOcupadasYDatepickers();
        document.getElementById('formReserva').reset();
    } catch (error) {
        console.error('Error al realizar la reserva:', error);
    }

    function actualizarFechasOcupadasYDatepickers() {
        fetch(`http://localhost:5000/rentals/booked-dates?address=${encodeURIComponent(address)}&address_number=${address_number}`)
            .then(res => res.json())
            .then(data => {
                fechasOcupadas = data.fechas || [];
                $('#checkin').datepicker('destroy');
                $('#checkout').datepicker('destroy');
                inicializarDatepickers();
            });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    realizarReserva();
});