# 🏠 **Alquiler Express**

Alquiler Express es una plataforma web orientada a optimizar la gestión de alquileres temporarios de propiedades, con el objetivo de escalar a nivel provincial y nacional.  
Esta solución reemplaza procesos manuales, favorece la escalabilidad del sistema y mejora la experiencia de los usuarios.

> 📌 El proyecto fue desarrollado de forma colaborativa en el marco de la asignatura **Ingeniería de Software 2**.

## 👥 **Colaboradores**

- [Matias Guaymas](https://github.com/MatiasGuaymas)
- [Francisco Lima](https://github.com/franciscolima05)
- [Matheo Lamiral](https://github.com/MatheoLamiral)
- [Francisco Acosta](https://github.com/franciscoacosta31)

## 📚 **Documentación**

Podés acceder a la documentación del proyecto desde el siguiente enlace:  
[🔗 Ver documentación](https://github.com/MatiasGuaymas/5to-Semestre/tree/main/INGE2/Practica/Documentacion)

## 👨‍💻 **Tecnologías Utilizadas**

### 💬 Lenguajes de Programación
- Python
- JavaScript

### 🌐 Lenguajes de Marcado y Estilos
- HTML
- CSS

### 🧠 Backend
- **Flask**: Framework web para Python.
- **SQLAlchemy**: ORM para la gestión de bases de datos.
- **SQLite**: Base de datos.

### 🎨 Frontend
- **Bootstrap**: Framework de estilos.
- **jQuery**: Biblioteca de JavaScript.
- **SweetAlert2**: Biblioteca para alertas personalizadas.
- **Chart.js**: Biblioteca para gráficos interactivos.
- **AOS (Animate On Scroll)**: Animaciones al hacer scroll.
- **Bootstrap Icons o FontAwesome**: Iconos para el diseño.
- **Mercado Pago**: Pagos de alquileres.

### ⚙️ Otras Herramientas
- **ngrok**
- **Node.js**

## 💻 Requisitos
- Git
- Python 3.x
- Node.js y npm
- (Opcional) Ngrok para integrar MercadoPago

## 🚀 Instalación y Ejecución

### 1. Clonar el Repositorio
- Clonar el repositorio:
  ```bash
  git clone https://github.com/tu-usuario/AlquilerExpress.git
  cd AlquilerExpress
  ```

### 2. Levantar el Backend
- Dirigirse a la carpeta `backend_flask`:
  ```bash
  cd backend_flask
  ```
- Ejecutar el servidor Flask:
  ```bash
  flask run
  ```

### 3. Levantar el Frontend
- Dirigerse a la carpeta `frontend`:
  ```bash
  cd frontend
  ```
- Instalar las dependencias, incluyendo `nodemon`:
  ```bash
  npm install nodemon
  ```
- Dirigirse a la carpeta `server` dentro de `frontend`:
  ```bash
  cd server
  ```
- Iniciar el servidor con:
  ```bash
  npx nodemon app.js
  ```

### 4. (Opcional) Integración con MercadoPago
- Si se desea usar MercadoPago para reservas, instalar y configurar Ngrok:
  - Descargar e iniciar Ngrok.
  - Levantar el servidor con Ngrok.
