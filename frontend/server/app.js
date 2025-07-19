import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const BASE_NGROK_URL = 'https://inspired-gecko-relieved.ngrok-free.app';


const client = new MercadoPagoConfig({ accessToken: 'APP_USR-5814447288152385-053109-2efa9b341e1d3c93a1f1acc07db35fed-2471795208' });


const app = express();
const PORT = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta test
// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../assets')));
app.use('/scripts', express.static(path.join(__dirname, '../assets/scripts')));
app.use('/views', express.static(path.join(__dirname, '../assets/views')));

// Middleware para establecer el tipo de contenido de los archivos .js
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/index.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/success.html'));
});
app.get('/failure', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/failure.html'));
});
app.get('/pending', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/pending.html'));
});

app.post('/create_preference', async (req, res) => {
    try {
        const body = {
            items: [
                {
                    title: req.body.title,
                    description: req.body.description,
                    quantity: Number(req.body.quantity),
                    currency_id: req.body.currency_id,
                    unit_price: Number(req.body.unit_price)
                }
            ],
            back_urls: {
                    success: `${BASE_NGROK_URL}/success?property_address=${req.body.property_address}&property_address_number=${req.body.address_number}&property_city=${req.body.city}&property_province=${req.body.province}&property_floor=${req.body.floor}&property_department=${req.body.department}&cantidad_personas=${req.body.cantidad_personas}&username=${req.body.username}&checkin=${req.body.checkin}&checkout=${req.body.checkout}`,
                    failure: `${BASE_NGROK_URL}/failure?property_address=${req.body.property_address}&property_address_number=${req.body.address_number}&property_city=${req.body.city}&property_province=${req.body.province}&property_floor=${req.body.floor}&property_department=${req.body.department}&cantidad_personas=${req.body.cantidad_personas}&username=${req.body.username}&checkin=${req.body.checkin}&checkout=${req.body.checkout}`,
                    pending: `${BASE_NGROK_URL}/pending?property_address=${req.body.property_address}&property_address_number=${req.body.address_number}&property_city=${req.body.city}&property_province=${req.body.province}&property_floor=${req.body.floor}&property_department=${req.body.department}&cantidad_personas=${req.body.cantidad_personas}&username=${req.body.username}&checkin=${req.body.checkin}&checkout=${req.body.checkout}`
            },
            auto_return: 'approved'
        };

        const preference = new Preference(client);
        const result = await preference.create({body});
        console.log('Resultado de preferencia:', result);
        res.json({
            id: result.id,
        });
    } catch (error) {
        console.log('Error al crear la preferencia:', error);
        if (error.cause) {
        console.log('Detalle:', error.cause);
    }
    res.status(500).json({ error: 'Error al crear la preferencia', detalle: error.message });
    }
});
   
app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/signIn.html'));
});

app.get('/uploadproperty', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/views/uploadProperty.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
