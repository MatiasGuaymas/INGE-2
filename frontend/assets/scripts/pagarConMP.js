const publicKey = 'APP_USR-9e9fcfad-321c-4047-a586-3507647659d5'; // Reemplaza con tu Public Key
const preferenceId = '2471795208-23b119b2-747d-429f-9a10-89ecd5d3d4c4'; // Reemplaza con tu preferenceId generado desde tu backend
const mp = new MercadoPago(publicKey);

const BASE_NGROK_URL = 'https://inspired-gecko-relieved.ngrok-free.app';


document.getElementById('btnReservar').addEventListener('click', async () => {
    try {

        const name = document.getElementById('property-name').innerText;
        const priceText = document.getElementById('property-price-per-night').innerText.trim().replace(/[^0-9.,]/g, '').replace(',', '.');
        const price_per_night = parseFloat(priceText);
        const address = document.getElementById('property-address').innerText;

        if (isNaN(price_per_night)) {
            alert('El precio de la propiedad no es válido.');
            return;
        }
        const orderData = {
            title: name,
            description: address,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: price_per_night
        }

        const response = await fetch(`${BASE_NGROK_URL}/create_preference`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });



        const preference = await response.json();
        console.log('Preference:', preference);
        console.log('Preference ID:', preference.id);
        mp.checkout({
            preference: { id: preference.id },
            autoOpen: true,
        });

    }
    catch (error) {
        console.error('Error al crear la preferencia:', error);
    }
});