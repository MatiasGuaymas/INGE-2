const ENDPOINT_CARGAR_FOTO = 'http://127.0.0.1:5000/cargar/property-image';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('formCargarFotoPropiedad');
    const mensaje = document.getElementById('mensajeFotoPropiedad');
    const btnCancelar = document.getElementById('btnCancelarFoto');

    if (!form) return;

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        mensaje.textContent = '';
        mensaje.className = '';

        const propertyAddress = document.getElementById('propertyAddress').value.trim();
        const propertyNumber = document.getElementById('propertyNumber').value.trim();
        const propertyFloor = document.getElementById('propertyFloor').value.trim();
        const propertyDepartment = document.getElementById('propertyDepartment').value.trim();
        const propertyCity = document.getElementById('propertyCity').value.trim();
        const propertyProvince = document.getElementById('propertyProvince').value.trim();

        const fileInput = document.getElementById('fotoPropiedad');
        const files = fileInput.files;

        if (!files || files.length === 0) {
            mensaje.textContent = 'Debe seleccionar al menos una imagen.';
            mensaje.className = 'alert alert-danger';
            return;
        }

        // Validar existencia de la propiedad antes de subir imágenes
        let existePropiedad = false;
        try {
            const queryParams = new URLSearchParams({
                address: propertyAddress.trim().toLowerCase(),
                address_number: propertyNumber,
                floor: propertyFloor || '0',
                department: propertyDepartment || 'n/a',
                city: propertyCity.trim().toLowerCase(),
                province: propertyProvince.trim().toLowerCase()
            });
            
            const res = await fetch(`http://127.0.0.1:5000/api/property?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                existePropiedad = !!(data && data.property);
            }
        } catch (e) {
            console.error('Error al verificar propiedad:', e);
        }
        if (!existePropiedad) {
            mensaje.textContent = 'Propiedad no encontrada. Verifique los datos antes de subir imágenes.';
            mensaje.className = 'alert alert-danger';
            return;
        }

        // Validar máximo de 5 imágenes por propiedad
        if (files.length > 5) {
            mensaje.textContent = 'Solo puedes subir hasta 5 imágenes por vez.';
            mensaje.className = 'alert alert-danger';
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        let errorMessages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                errorCount++;
                errorMessages.push(`El archivo ${file.name} no es una imagen.`);
                continue;
            }
            const formData = new FormData();
            formData.append('address', propertyAddress);
            formData.append('address_number', propertyNumber);
            formData.append('image', file);
            formData.append('floor', propertyFloor);
            formData.append('department', propertyDepartment);
            formData.append('city', propertyCity);
            formData.append('province', propertyProvince);

            try {
                const response = await fetch(ENDPOINT_CARGAR_FOTO, {
                    method: 'POST',
                    body: formData
                });
                const respData = await response.json();
                if (!response.ok) {
                    errorCount++;
                    errorMessages.push(respData.error || `Error al cargar la imagen ${file.name}`);
                } else {
                    successCount++;
                }
            } catch (error) {
                errorCount++;
                errorMessages.push(`Error al cargar la imagen ${file.name}`);
            }
        }

        if (successCount > 0 && errorCount === 0) {
            mensaje.textContent = `Se cargaron ${successCount} imagen(es) correctamente.`;
            mensaje.className = 'alert alert-success';
            form.reset();
        } else if (successCount > 0 && errorCount > 0) {
            mensaje.textContent = `Se cargaron ${successCount} imagen(es) correctamente.\n${errorMessages.join('\n')}`;
            mensaje.className = 'alert alert-warning';
        } else if (errorCount > 0) {
            mensaje.textContent = errorMessages.join('\n');
            mensaje.className = 'alert alert-danger';
        }
    });

    btnCancelar.addEventListener('click', function () {
        form.reset();
        mensaje.textContent = 'La operacion fue cancelada con éxito.';

        const fileInput = document.getElementById('fotoPropiedad');
        if (fileInput) {
            fileInput.value = '';
        }
        // Limpiar el texto de nombre de archivo mostrado
        const nombreArchivo = document.getElementById('nombreArchivo');
        if (nombreArchivo) {
            nombreArchivo.textContent = '';
        }
    });

    // Mostrar todos los nombres de archivos seleccionados
    const fileInput = document.getElementById('fotoPropiedad');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const files = e.target.files;
            let nombres = '';
            if (files.length === 1) {
                nombres = files[0].name;
            } else if (files.length > 1) {
                nombres = Array.from(files).map(f => f.name).join(', ');
            }
            document.getElementById('nombreArchivo').textContent = nombres;
        });
    }
});