# ----------------------------
# Módulos estándar de Python
# ----------------------------
import os
import re
import secrets
from datetime import datetime, date, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from datetime import datetime, timedelta

# ----------------------------
# Módulos de terceros
# ----------------------------
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as SQLAlchemySession
from sqlalchemy import func
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

# ----------------------------
# Modelos de la aplicación
# ----------------------------
from models.main import (
    Session,
    User,
    Employee,
    Tenant,
    Manager,
    Property,
    PropertyImage,
    PropertyQuestion,
    PropertyAnswer,
    PropertyRating,
    Rental
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'property_images')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

manager_verification_codes = {}

# Función para validar extensiones de archivo
def allowed_file(filename):
    return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return "Welcome to the Flask App!"

@app.route('/users', methods=['GET'])
def get_users():
    with Session() as session:
        users = session.query(User).all()
        return jsonify([{
            'username': user.username,
            'email': user.email,
        } for user in users])
    
@app.route('/employees', methods=['GET'])
def get_employees():
    with Session() as session:
        # Obtener solo los managers activos (que no empiezan con **)
        managers = {
            manager.username for manager in session.query(Manager)
            .filter(~Manager.username.like('**%')).all()
        }
        
        # Obtener solo los empleados activos (que no empiezan con **)
        employees = session.query(Employee).filter(~Employee.username.like('**%')).all()
        
        # Crear el resultado con la información del rol
        result = []
        for employee in employees:
            result.append({
                'username': employee.username,
                'email': employee.email,
                'role': 'manager' if employee.username in managers else 'employee'
            })
            
        return jsonify(result)
    
@app.route('/tenants', methods=['GET'])
def get_tenants():
    with Session() as session:
        tenants = session.query(Tenant).all()
        return jsonify([{
            'username': tenant.username,
            'email': tenant.email,
            'last_name': tenant.last_name,
            'first_name': tenant.first_name,
            'dni': tenant.dni,
            'birth_date': tenant.birth_date.strftime('%Y-%m-%d') if tenant.birth_date else None,
            'phone': tenant.phone
        } for tenant in tenants])

def validate_email(email):
    """Validate email format."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))

def validate_password(password):
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

def validate_username(username):
    # 3-50 caracteres, solo letras, números, guion bajo, punto, sin espacios, no inicia/termina con . o _
    pattern = r'^(?![._])[A-Za-z0-9._]{3,50}(?<![._])$'
    return bool(re.match(pattern, username))

def validate_name(name):
    # Solo letras y espacios, tildes y Ñ, 2-50 caracteres
    pattern = r'^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,50}$'
    return bool(re.match(pattern, name))

def validate_dni(dni):
    # Solo números, 7 u 8 dígitos
    return dni.isdigit() and 6 <= len(dni) <= 9

def validate_phone(phone):
    # Solo números, puede empezar con +, 8-15 dígitos
    pattern = r'^\+?[0-9]{8,15}$'
    return bool(re.match(pattern, phone))

def validate_birth_date(birth_date_str):
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        if age < 18:
            return False, 'El cliente debe ser mayor de edad'
        return True, birth_date
    except Exception:
        return False, 'Fecha de nacimiento inválida'

@app.route('/cargar', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'error': 'Porfavor llene todos los campos'}), 400

    if not validate_email(email):
        return jsonify({'error': 'El mail ingresado no es valido'}), 400
    
    if not validate_password(password):
        return jsonify({'error': 'La contraseña debe tener entre 8 y 16 caracteres, una mayúscula y un caracter especial'}), 400

    user = User(username=username, password=password, email=email)

    try:
        with Session() as session:
            session.add(user)
            session.commit()
        return jsonify({'message': 'User created successfully'}), 201
    except IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

# Funcionalidad: Enviar mail con datos de cuenta
        
def enviar_mail_bienvenida(email, username, password):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Bienvenido a AlquilerExpress'

    body = f'''¡Bienvenido a AlquilerExpress!
    
    Tus datos de acceso son:
    Usuario: {username}
    Contraseña: {password}

    ¡Gracias por registrarte!
    '''

    mensaje.attach(MIMEText(body, 'plain'))

    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail: {e}")

@app.route('/cargar/employee', methods=['POST'])
def create_employee():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'error': 'Missing required fields'}), 400

    if not validate_email(email):
        return jsonify({'error': ''}), 400
    
    if not validate_password(password):
        return jsonify({'error': 'La contraseña debe tener entre 8 y 16 caracteres, una mayúscula y un caracter especial'}), 400

    with Session() as session:
        if session.query(Employee).filter_by(username=username).first():
            return jsonify({'error': 'El usuario ya se encuentra registrado'}), 409
        if session.query(Employee).filter_by(email=email).first():
            return jsonify({'error': 'El correo electrónico ya está en uso'}), 409

        employee = Employee(username=username, password=password, email=email)
        session.add(employee)
        session.commit()
    enviar_mail_bienvenida(email, username, password)
    return jsonify({'message': 'Employee created successfully'}), 201
    
@app.route('/cargar/manager', methods=['POST'])
def create_manager():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'error': 'Por favor, complete todos los campos'}), 400

    if not validate_email(email):
        return jsonify({'error': 'El corre electrónico ya se encuentra registrado'}), 400

    if not validate_password(password):
        return jsonify({'error': 'La contraseña debe tener entre 8 y 16 caracteres, una mayúscula y un caracter especial'}), 400

    with Session() as session:
        if session.query(Manager).filter_by(username=username).first():
            return jsonify({'error': 'El usuario ya se encuentra registrado'}), 409
        if session.query(Manager).filter_by(email=email).first():
            return jsonify({'error': 'El correo electrónico ya está en uso'}), 409

        manager = Manager(username=username, password=password, email=email)
        session.add(manager)
        session.commit()
    enviar_mail_bienvenida(email, username, password)
    return jsonify({'message': 'Manager created successfully'}), 201
    
@app.route('/cargar/tenant', methods=['POST'])
def create_tenant():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    last_name = data.get('last_name')
    first_name = data.get('first_name')
    dni = data.get('dni')
    birth_date_str = data.get('birth_date')
    phone = data.get('phone')

    # Validación de campos requeridos
    if not all([username, password, email, last_name, first_name, dni, birth_date_str, phone]):
        return jsonify({'error': 'Se deben ingresar todos los datos'}), 400

    if not validate_username(username):
        return jsonify({'error': 'El nombre de usuario debe tener entre 3 y 50 caracteres, solo letras, números, puntos o guiones bajos, y no puede comenzar ni terminar con punto o guión bajo.'}), 400

    if not validate_email(email):
        return jsonify({'error': 'El email ingresado no es válido'}), 400

    if not validate_password(password):
        return jsonify({'error': 'La contraseña debe tener entre 8 y 16 caracteres, una mayúscula y un caracter especial'}), 400

    if not validate_name(last_name):
        return jsonify({'error': 'El apellido solo puede contener letras y espacios (máx. 50 caracteres).'}), 400

    if not validate_name(first_name):
        return jsonify({'error': 'El nombre solo puede contener letras y espacios (máx. 50 caracteres).'}), 400

    if not validate_dni(dni):
        return jsonify({'error': 'El DNI debe contener solo números y tener entre 6 y 9 dígitos.'}), 400

    if not validate_phone(phone):
        return jsonify({'error': 'El teléfono debe contener solo números (puede comenzar con +) y tener entre 8 y 15 dígitos.'}), 400

    valid_birth, birth_date_or_msg = validate_birth_date(birth_date_str)
    if not valid_birth:
        return jsonify({'error': birth_date_or_msg}), 400
    birth_date = birth_date_or_msg

    # Unicidad de usuario y correo
    with Session() as session:
        if session.query(User).filter_by(username=username).first():
            return jsonify({'error': 'El nombre de usuario ya existe'}), 409
        if session.query(User).filter_by(email=email).first():
            return jsonify({'error': 'El correo electrónico ya está en uso'}), 409

        tenant = Tenant(
            username=username,
            password=password,
            email=email,
            last_name=last_name,
            first_name=first_name,
            dni=dni,
            birth_date=birth_date,
            phone=phone
        )
        session.add(tenant)
        session.commit()

    enviar_mail_bienvenida(email, username, password)
    return jsonify({'message': 'Cuenta creada con éxito'}), 201
    
@app.route('/cargar/property', methods=['POST'])
def create_property():
    # Obtener datos del formulario (no de JSON)
    address = request.form.get('address')
    address_number = request.form.get('address_number')
    property_name = request.form.get('property_name')
    price_per_night = request.form.get('price_per_night')
    capacity = request.form.get('capacity')
    floor = request.form.get('floor')
    department = request.form.get('department')
    city = request.form.get('city')
    province = request.form.get('province')
    politica_de_cancelacion = request.form.get('politica_de_cancelacion') 

    # Validar campos obligatorios
    if not address or not address_number or not property_name or not price_per_night or not capacity or not city or not province or not politica_de_cancelacion or 'property_photo' not in request.files or request.files['property_photo'].filename == '':
        return jsonify({'error': 'Por favor, complete todos los campos'}), 400

    # Validar política de cancelación
    if politica_de_cancelacion not in ['flexible', 'moderate', 'strict']:
        return jsonify({'error': 'La política de cancelación no es válida'}), 400

    file = request.files['property_photo']

    # Validar extensión del archivo
    if not allowed_file(file.filename):
        return jsonify({'error': f'El archivo {file.filename} no es una imagen'}), 400

    if not floor:
        floor = 0

    if not department:
        department = 'N/A'

    address = address.strip().lower()
    department = department.strip().lower() if department else 'n/a'
    city = city.strip().lower()
    province = province.strip().lower()

    try:
        price_per_night = float(price_per_night)
        capacity = int(capacity)
        if floor is not None and floor != "":
            floor = int(floor)
        else:
            floor = None
    except (ValueError, TypeError):
        return jsonify({'error': 'Los campos numéricos deben ser válidos'}), 400

    if price_per_night <= 0:
        return jsonify({'error': 'El precio por noche debe ser mayor a 0'}), 400

    if capacity <= 0:
        return jsonify({'error': 'La capacidad debe ser mayor a 0'}), 400

    if property_name and not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+$', property_name):
        return jsonify({'error': 'El nombre de la propiedad solo puede contener letras, números y espacios'}), 400

    property = Property(
        address=address,
        address_number=address_number,
        property_name=property_name,
        price_per_night=price_per_night,
        capacity=capacity,
        floor=floor,
        department=department,
        city=city,
        province=province,
        politica_de_cancelacion=politica_de_cancelacion,
    )

    try:
        with Session() as session:
            session.add(property)
            session.commit()

            # Guardar la imagen
            filename = secure_filename(f"{address}_{address_number}_{floor}_{department}_{city}_{province}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            # Añadir la imagen a la propiedad
            property_image = PropertyImage(
                property_address=property.address,
                property_address_number=property.address_number,
                property_floor=property.floor,
                property_department=property.department,
                property_city=property.city,
                property_province=property.province,
                image_path=filename
            )
            session.add(property_image)
            session.commit()

        return jsonify({'message': 'Propiedad cargada con éxito'}), 201
    except IntegrityError:
        return jsonify({'error': 'Esta propiedad ya existe'}), 409
    except Exception as e:
        return jsonify({'error': f'Error al guardar la propiedad: {str(e)}'}), 500

@app.route('/searchProperty', methods=['GET'])
def search_property():
    address = request.args.get('address')
    address_number = request.args.get('address_number')
    property_name = request.args.get('property_name')
    price_min = request.args.get('price_per_night_min')
    price_max = request.args.get('price_per_night_max')
    capacity = request.args.get('capacity')
    floor = request.args.get('floor')
    department = request.args.get('department')
    city = request.args.get('city')
    province = request.args.get('province')
    cancel_policy = request.args.get('politica_de_cancelacion')
    fecha_ingreso = request.args.get('fecha_ingreso')
    fecha_egreso = request.args.get('fecha_egreso')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 9))

    print("Fecha ingreso:", fecha_ingreso, "Fecha egreso:", fecha_egreso)

    # Normalizar campos para búsqueda
    if address:
        address = address.strip().lower()
    if department:
        department = department.strip().lower()
    if city:
        city = city.strip().lower()
    if province:
        province = province.strip().lower()

    try:
        if capacity:
            try:
                capacity_val = int(capacity)
                if capacity_val < 0:
                    return jsonify({'error': 'La capacidad ingresada no es válida'}), 400
            except ValueError:
                return jsonify({'error': 'La capacidad ingresada no es un número'}), 400
        if price_min:
            try:
                price_min_val = int(price_min)
                if price_min_val < 0:
                    return jsonify({'error': 'El precio mínimo no es válido'}), 400
            except ValueError:
                return jsonify({'error': 'El precio mínimo no es un número'}), 400
        if price_max:
            try:
                price_max_val = int(price_max)
                if price_max_val < 0:
                    return jsonify({'error': 'El precio máximo no es válido'}), 400
            except ValueError:
                return jsonify({'error': 'El precio máximo no es un número'}), 400

        with Session() as session:
            query = session.query(Property)
            if address:
                query = query.filter(Property.address == address)
            if address_number:
                query = query.filter(Property.address_number == address_number)
            if property_name:
                query = query.filter(Property.property_name.ilike(f'%{property_name}%'))
            if price_min:
                query = query.filter(Property.price_per_night >= price_min)
            if price_max:
                query = query.filter(Property.price_per_night <= price_max)
            if capacity:
                query = query.filter(Property.capacity >= capacity)
            if floor:
                query = query.filter(Property.floor == floor)
            if department:
                query = query.filter(Property.department == department)
            if city:
                query = query.filter(Property.city.ilike(f'%{city}%'))
            if province:
                query = query.filter(Property.province.ilike(f'%{province}%'))
            if cancel_policy:
                query = query.filter(Property.politica_de_cancelacion == cancel_policy)
            query = query.filter(Property.is_active == True)  # Filtrar solo propiedades activas

            # Filtrar por disponibilidad en rango de fechas
            if fecha_ingreso and fecha_egreso:
                try:
                    fecha_in = datetime.strptime(fecha_ingreso, "%Y-%m-%d").date()
                    fecha_out = datetime.strptime(fecha_egreso, "%Y-%m-%d").date()
                except Exception:
                    return jsonify({'error': 'Formato de fecha inválido'}), 400

                # Subconsulta: propiedades con reservas activas en ese rango
                subq = session.query(Rental.property_address, Rental.property_address_number, Rental.property_floor, Rental.property_department, Rental.property_city, Rental.property_province).filter(
                    Rental.status == 'activo',
                    Rental.fecha_tentativa_ingreso < fecha_out,
                    Rental.fecha_tentativa_salida > fecha_in
                ).subquery()

                query = query.filter(~(
                    (Property.address == subq.c.property_address) &
                    (Property.address_number == subq.c.property_address_number) &
                    (Property.floor == subq.c.property_floor) &
                    (Property.department == subq.c.property_department) &
                    (Property.city == subq.c.property_city) &
                    (Property.province == subq.c.property_province)
                ))

            total = query.count()
            properties = query.order_by(Property.address, Property.address_number)\
                .offset((page - 1) * per_page).limit(per_page).all()

            result = []
            for prop in properties:
                image = session.query(PropertyImage).filter_by(
                    property_address=prop.address,
                    property_address_number=prop.address_number,
                    property_floor=prop.floor,
                    property_department=prop.department,
                    property_city=prop.city,
                    property_province=prop.province,
                    is_active=True
                ).first()
                image_url = f"/property_images/{image.image_path}" if image else "/property_images/default.jpg"
                
                # Calcular promedio de calificación
                avg_rating = session.query(func.avg(PropertyRating.rating)).filter_by(
                    property_address=prop.address,
                    property_address_number=prop.address_number,
                    property_floor=prop.floor,
                    property_department=prop.department,
                    property_city=prop.city,
                    property_province=prop.province
                ).scalar()
                avg_rating = round(avg_rating, 2) if avg_rating is not None else None

                result.append({
                    'address': prop.address,
                    'address_number': prop.address_number,
                    'property_name': prop.property_name,
                    'price_per_night': prop.price_per_night,
                    'capacity': prop.capacity,
                    'floor': prop.floor,                
                    'department': prop.department,      
                    'city': prop.city,
                    'province': prop.province,
                    'image_url': image_url,
                    'politica_de_cancelacion': prop.politica_de_cancelacion,
                    'average_rating': avg_rating,
                    'on_maintenance': prop.on_maintenance
                })
            return jsonify({'properties': result, 'total': total})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/verifyUser', methods=['POST'])
def verify_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        with Session() as session:
            user = session.query(User).filter_by(username=username, password=password).first()
            if user:
                return jsonify({'message': 'User verified successfully', 'user': user.username}), 200
            else:
                return jsonify({'error': 'Nombre de usuario y/o contraseña incorrectos'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/verifyRole', methods=['POST'])
def verify_role():
    data = request.get_json()
    username = data.get('username') 
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        with Session() as session:
            # Primero busca como Manager
            manager = session.query(Manager).filter_by(username=username, password=password).first()
            if manager:
                code = generateCode()
                manager_verification_codes[manager.username] = code  # Guardar el código
                print(f"[INFO] Código de verificación generado para {manager.username}: {code}")

                # --- Envío de mail con email.mime y smtplib ---
                remitente = 'alquilerexpress620@gmail.com'
                clave = 'vtys xltx eerm evhm'
                destinatario = manager.email

                mensaje = MIMEMultipart()
                mensaje['From'] = remitente
                mensaje['To'] = destinatario
                mensaje['Subject'] = 'Codigo de verificacion'

                body = f'Este es tu codigo de Verificacion: <strong>{code}</strong>'
                mensaje.attach(MIMEText(body, 'html'))

                try:
                    smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
                    smtp_server.starttls()
                    smtp_server.login(remitente, clave)
                    smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
                    smtp_server.quit()
                except Exception as e:
                    print(f"[ERROR] Fallo al enviar mail: {e}")
                    return jsonify({'error': f'Fallo al enviar mail: {str(e)}'}), 500
                # --- Fin envío de mail ---

                return jsonify({'message': 'Manager verified', 'role': 'manager', 'username': manager.username}), 200

            # Si no es manager, busca como Employee
            employee = session.query(Employee).filter_by(username=username, password=password).first()
            if employee:
                return jsonify({'message': 'Employee verified', 'role': 'employee', 'username': employee.username}), 200

            # Si no es employee, busca como Tenant
            tenant = session.query(Tenant).filter_by(username=username, password=password).first()
            if tenant:
                return jsonify({'message': 'Tenant verified', 'role': 'tenant', 'username': tenant.username}), 200

            # Si no es ninguno
            return jsonify({'error': 'Nombre de usuario y/o contraseña incorrectos'}), 401
    except Exception as e:
        print(f"[ERROR] Excepción en verify_role: {e}")
        return jsonify({'error': str(e)}), 500

def enviar_mail_confirmacion_rental(email, rental):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Confirmación de Reserva - Alquiler Express'

    body = f'''Hola {rental.tenant_username},

    ¡Tu reserva fue realizada con éxito!

    Detalles de la reserva:
    - Propiedad: {rental.property_address} {rental.property_address_number}, {rental.property_city}, {rental.property_province}
    - Fecha de ingreso: {rental.fecha_tentativa_ingreso.strftime('%d/%m/%Y')}
    - Fecha de salida: {rental.fecha_tentativa_salida.strftime('%d/%m/%Y')}
    - Cantidad de personas: {rental.cantidad_personas}
    - Total: ${rental.total}

    Gracias por confiar en Alquiler Express.
    '''

    mensaje.attach(MIMEText(body, 'plain'))

    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail de confirmación de reserva: {e}")

@app.route('/cargar/rental', methods=['POST'])
def create_rental():
    data = request.get_json()
    property_address = data.get('property_address')
    property_address_number = int(data.get('property_address_number'))
    property_floor = data.get('property_floor', 0)  # Por defecto, piso 0
    property_department = data.get('property_department', 'N/A')
    property_city = data.get('property_city')
    property_province = data.get('property_province')
    tenant_username = data.get('tenant_username')
    status = data.get('status', 'activo')
    fecha_entrega_llave = data.get('fecha_entrega_llave')  # formato: 'YYYY-MM-DD'
    fecha_devolucion_llave = data.get('fecha_devolucion_llave')
    cantidad_personas = data.get('cantidad_personas')
    fecha_tentativa_ingreso = data.get('fecha_tentativa_ingreso')
    fecha_tentativa_salida = data.get('fecha_tentativa_salida')
    total = data.get('total')

    if not property_address or not property_address_number or not tenant_username or not cantidad_personas or not property_city or not property_province or not fecha_tentativa_ingreso or not fecha_tentativa_salida or not total:
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    with Session() as session:
        # Verificar que el tenant exista
        tenant = session.query(Tenant).filter_by(username=tenant_username).first()
        if not tenant:
            return jsonify({'error': 'El usuario ingresado no existe.'}), 404

        try:
            fecha_entrega_llave_obj = None
            fecha_devolucion_llave_obj = None
            if fecha_entrega_llave:
                fecha_entrega_llave_obj = datetime.strptime(fecha_entrega_llave, "%Y-%m-%d").date()
            if fecha_devolucion_llave:
                fecha_devolucion_llave_obj = datetime.strptime(fecha_devolucion_llave, "%Y-%m-%d").date()
        except Exception:
            return jsonify({'error': 'Formato de fecha inválido'}), 400

        rental = Rental(
            status=status,
            fecha_entrega_llave=fecha_entrega_llave_obj,
            fecha_devolucion_llave=fecha_devolucion_llave_obj,
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            tenant_username=tenant_username,
            cantidad_personas=cantidad_personas,
            fecha_tentativa_ingreso=datetime.strptime(fecha_tentativa_ingreso, "%Y-%m-%d").date(),
            fecha_tentativa_salida=datetime.strptime(fecha_tentativa_salida, "%Y-%m-%d").date(),
            total = total
        )
        session.add(rental)
        session.commit()
        enviar_mail_confirmacion_rental(tenant.email, rental)
        return jsonify({'message': 'Alquiler creado correctamente'}), 201
    
@app.route('/rentals', methods=['GET'])
def get_rentals():
    with Session() as session:
        rentals = session.query(Rental).all()
        activos = []
        cancelados = []
        finalizados = []
        for r in rentals:
            # Obtener datos extendidos del inquilino
            tenant = session.query(Tenant).filter_by(username=r.tenant_username).first()
            user = session.query(User).filter_by(username=r.tenant_username).first()
            property_obj = session.query(Property).filter_by(
                address=r.property_address,
                address_number=r.property_address_number,
                floor=r.property_floor,
                department=r.property_department,
                city=r.property_city,
                province=r.property_province
            ).first()
            rental_data = {
                'id': r.id,
                'status': r.status,
                'fecha_entrega_llave': r.fecha_entrega_llave.strftime('%Y-%m-%d') if r.fecha_entrega_llave else None,
                'fecha_devolucion_llave': r.fecha_devolucion_llave.strftime('%Y-%m-%d') if r.fecha_devolucion_llave else None,
                'fecha_tentativa_ingreso': r.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if r.fecha_tentativa_ingreso else None,
                'fecha_tentativa_salida': r.fecha_tentativa_salida.strftime('%Y-%m-%d') if r.fecha_tentativa_salida else None,
                'property_address': r.property_address,
                'property_address_number': r.property_address_number,
                'property_floor': r.property_floor,
                'property_department': r.property_department,
                'property_city': r.property_city,
                'property_province': r.property_province,
                'property_name': property_obj.property_name if property_obj else '',
                'tenant_username': r.tenant_username,
                'tenant_first_name': tenant.first_name if tenant else '',
                'tenant_last_name': tenant.last_name if tenant else '',
                'tenant_dni': tenant.dni if tenant else '',
                'tenant_phone': tenant.phone if tenant else '',
                'tenant_email': user.email if user else '',
                'cantidad_personas': r.cantidad_personas,
                'total': r.total,
                'motivo_devolucion_temprana': getattr(r, 'motivo_devolucion_temprana', None)
            }
            if r.status == 'cancelado':
                cancelados.append(rental_data)
            elif r.status == 'finalizado':
                finalizados.append(rental_data)
            else:
                activos.append(rental_data)
        return jsonify({'activos': activos, 'cancelados': cancelados, 'finalizados': finalizados})

@app.route('/rentals/tenant/<username>', methods=['GET'])
def get_rentals_by_tenant(username):
    with Session() as session:
        rentals = session.query(Rental).filter_by(tenant_username=username).all()
        result = []
        for r in rentals:
            property_obj = session.query(Property).filter_by(
                address=r.property_address,
                address_number=r.property_address_number,
                floor=r.property_floor,
                department=r.property_department,
                city=r.property_city,
                province=r.property_province
            ).first()
            result.append({
                'id': r.id,
                'status': r.status,
                'fecha_entrega_llave': r.fecha_entrega_llave.strftime('%Y-%m-%d') if r.fecha_entrega_llave else None,
                'fecha_devolucion_llave': r.fecha_devolucion_llave.strftime('%Y-%m-%d') if r.fecha_devolucion_llave else None,
                'fecha_tentativa_ingreso': r.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if r.fecha_tentativa_ingreso else None,
                'fecha_tentativa_salida': r.fecha_tentativa_salida.strftime('%Y-%m-%d') if r.fecha_tentativa_salida else None,
                'property_address': r.property_address,
                'property_address_number': r.property_address_number,
                'property_floor': r.property_floor,
                'property_department': r.property_department,
                'property_city': r.property_city,
                'property_province': r.property_province,
                'property_name': property_obj.property_name if property_obj else '',
                'cantidad_personas': r.cantidad_personas,
                'total': r.total,
                'motivo_devolucion_temprana': getattr(r, 'motivo_devolucion_temprana', None)
            })
        return jsonify(result)

@app.route('/rentals/cancelled/<username>', methods=['GET'])
def get_cancelled_rentals_by_tenant(username):
    with Session() as session:
        rentals = session.query(Rental).filter_by(tenant_username=username, status='cancelado').all()
        return jsonify([{
            'id': r.id,
            'status': r.status,
            'fecha_tentativa_ingreso': r.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if r.fecha_tentativa_ingreso else None,
            'fecha_tentativa_salida': r.fecha_tentativa_salida.strftime('%Y-%m-%d') if r.fecha_tentativa_salida else None,
            'property_address': r.property_address,
            'property_address_number': r.property_address_number,
            'property_floor': r.property_floor,
            'property_department': r.property_department,
            'property_city': r.property_city,
            'property_province': r.property_province
        } for r in rentals])

@app.route('/rentals/finalized/<username>', methods=['GET'])
def get_finalized_rentals_by_tenant(username):
    with Session() as session:
        rentals = session.query(Rental).filter_by(tenant_username=username, status='finalizado').all()
        return jsonify([{
            'id': r.id,
            'status': r.status,
            'fecha_entrega_llave': r.fecha_entrega_llave.strftime('%Y-%m-%d') if r.fecha_entrega_llave else None,
            'fecha_devolucion_llave': r.fecha_devolucion_llave.strftime('%Y-%m-%d') if r.fecha_devolucion_llave else None,
            'fecha_tentativa_ingreso': r.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if r.fecha_tentativa_ingreso else None,
            'fecha_tentativa_salida': r.fecha_tentativa_salida.strftime('%Y-%m-%d') if r.fecha_tentativa_salida else None,
            'property_address': r.property_address,
            'property_address_number': r.property_address_number,
            'property_floor': r.property_floor,
            'property_department': r.property_department,
            'property_city': r.property_city,
            'property_province': r.property_province,
            'motivo_devolucion_temprana': getattr(r, 'motivo_devolucion_temprana', None)
        } for r in rentals])

def enviar_mail_cancelacion(email, username, nombreReserva, politicaCancelacion, montoADevolver, fechaInicio):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Su reserva ha sido cancelada'

    body = f'''Hola {username},
    Tu reserva para {nombreReserva} con fecha de inicio {fechaInicio} fue cancelada, por tu politica de cancelacion ({politicaCancelacion}) se te devolverán ${montoADevolver} en las próximas 24 horas.
    Si tienes alguna duda, no dudes en contactarnos.
    Gracias por elegirnos.
    Alquiler Express
    '''

    mensaje.attach(MIMEText(body, 'plain'))
    try:
        print(f"Enviando email a {destinatario}...")
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail: {e}")
        raise


@app.route('/rentals/cancel', methods=['POST'])
def cancel_rental():
    data = request.get_json()
    rental_id = data.get('rental_id')
    username = data.get('username')

    if not rental_id or not username:
        return jsonify({'error': 'Missing required fields'}), 400

    with Session() as session:
        rental = session.query(Rental).filter_by(id=rental_id, tenant_username=username, status='activo').first()
        if not rental:
            return jsonify({'error': 'Rental not found or not active'}), 404
        
        address = rental.property_address.strip().lower()
        department = rental.property_department.strip().lower() if rental.property_department else 'n/a'
        city = rental.property_city.strip().lower()
        province = rental.property_province.strip().lower()

        property = session.query(Property).filter_by(
            address=address,
            address_number=rental.property_address_number,
            floor=rental.property_floor,
            department=department,
            city=city,
            province=province
        ).first()

        if not property:
            return jsonify({'error': 'Property not found'}), 404
        
        user = session.query(Tenant).filter_by(username=rental.tenant_username).first()
        if not user:
            return jsonify({'error': 'Tenant not found'}), 404

        hoy = datetime.now().date()
        if(property.politica_de_cancelacion == 'flexible'):
            if(rental.fecha_tentativa_ingreso and hoy >= rental.fecha_tentativa_ingreso):
                return jsonify({'error': 'Solo puedes cancelar hasta el día anterior al inicio del alquiler.'}), 400
            montoADevolver = rental.total
            enviar_mail_cancelacion(user.email, user.username, property.property_name, property.politica_de_cancelacion, montoADevolver, rental.fecha_tentativa_ingreso)

        elif(property.politica_de_cancelacion == 'moderate'):
            if(rental.fecha_tentativa_ingreso and hoy >= rental.fecha_tentativa_ingreso - timedelta(days=1)):
                return jsonify({'error': 'Solo puedes cancelar hasta 1 días antes del inicio del alquiler.'}), 400
            montoADevolver = rental.total * 0.2
            enviar_mail_cancelacion(user.email, user.username, property.property_name, property.politica_de_cancelacion, montoADevolver, rental.fecha_tentativa_ingreso)
        elif(property.politica_de_cancelacion == 'strict'):
            if(rental.fecha_tentativa_ingreso and hoy >= rental.fecha_tentativa_ingreso - timedelta(days=1)):
                return jsonify({'error': 'Solo puedes cancelar hasta 1 días antes del inicio del alquiler.'}), 400
            montoADevolver = 0
            enviar_mail_cancelacion(user.email, user.username, property.property_name, property.politica_de_cancelacion, montoADevolver, rental.fecha_tentativa_ingreso)

        rental.status = 'cancelado'
        session.commit()

        return jsonify({'message': 'Reserva cancelada correctamente'}), 200

@app.route('/cargar/property-image', methods=['POST'])
def upload_property_image():
    address = request.form.get('address')
    address_number = request.form.get('address_number')
    city = request.form.get('city')
    province = request.form.get('province')
    floor = request.form.get('floor')
    department = request.form.get('department')

    if not address or not address_number or not city or not province:
        return jsonify({'error': 'Por favor, complete todos los campos'}), 400
    
    if not floor:
        floor = 0

    if not department:
        department = 'N/A'

    address = address.strip().lower()
    department = department.strip().lower() if department else 'n/a'
    city = city.strip().lower()
    province = province.strip().lower()
    

    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'El archivo seleccionado no es una imagen'}), 400

    with Session() as session:
        prop = session.query(Property).filter_by(
            address=address,
            address_number=address_number,
            floor=floor,
            department=department,
            city=city,
            province=province
        ).first()
        if not prop:
            return jsonify({'error': 'Propiedad no encontrada'}), 404

        filename = secure_filename(f"{address}_{address_number}_{floor}_{department}_{city}_{province}_{file.filename}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        # Crear instancia de PropertyImage
        property_image = PropertyImage(
            property_address=address,
            property_address_number=address_number,
            property_floor=floor,
            property_department=department,
            property_city=city,
            property_province=province,
            image_path=filename
        )
        session.add(property_image)
        session.commit()

    return jsonify({'message': 'Foto cargada con éxito'}), 201


def generateCode():
    codigo = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
    return codigo


@app.route('/verify-manager-code', methods=['POST'])
def verify_manager_code():
    data = request.get_json()
    code_verify = data.get('code')
    username = data.get('username')
    print(code_verify)
    if not username or not code_verify:
        return jsonify({'error': 'Missing required fields'}), 400
    expected_code = manager_verification_codes.get(username)
    print(expected_code)
    if expected_code and code_verify == expected_code:
        del manager_verification_codes[username]
        return jsonify({'message': 'Código verificado correctamente'}), 200
    else:
        return jsonify({'error': 'Código incorrecto o expirado'}), 400

@app.route('/api/properties', methods=['GET'])
def get_properties():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 9))
    with Session() as session:
        total = session.query(Property).count()
        properties = (
            session.query(Property)
            .filter(Property.is_active == True)  # Filtrar solo propiedades activas
            .order_by(Property.address, Property.address_number)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        result = []
        for prop in properties:
            images = session.query(PropertyImage).filter_by(
                property_address=prop.address,
                property_address_number=prop.address_number,
                property_floor=prop.floor,
                property_department=prop.department,
                property_city=prop.city,
                property_province=prop.province,
                is_active=True
            ).all()
            image_urls = [f"/property_images/{img.image_path}" for img in images] or ["/property_images/default.jpg"]
            # Obtener calificación promedio
            avg_rating = session.query(func.avg(PropertyRating.rating)).filter_by(
                property_address=prop.address,
                property_address_number=prop.address_number,
                property_floor=prop.floor,
                property_department=prop.department,
                property_city=prop.city,
                property_province=prop.province
            ).scalar()
            avg_rating = round(avg_rating, 2) if avg_rating is not None else None
            result.append({
                'address': prop.address,
                'address_number': prop.address_number,
                'property_name': prop.property_name,
                'price_per_night': prop.price_per_night,
                'capacity': prop.capacity,
                'floor': prop.floor,
                'department': prop.department,
                'city': prop.city,
                'province': prop.province,
                'image_urls': image_urls,
                'average_rating': avg_rating,
                'politica_de_cancelacion': prop.politica_de_cancelacion,
                'on_maintenance': prop.on_maintenance,
                'is_active': prop.is_active
            })
        return jsonify({
            'properties': result,
            'total': total
        })

@app.route('/property_images/<filename>')
def property_images(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/property', methods=['GET'])
def get_property():
    address = request.args.get('address')
    address_number = request.args.get('address_number')
    floor = request.args.get('floor')
    department = request.args.get('department')
    city = request.args.get('city')
    province = request.args.get('province')

    with Session() as session:
        # Buscar la propiedad (puede que solo se use address y address_number, adaptar si es necesario)
        prop = session.query(Property).filter_by(
            address=address,
            address_number=address_number,
            is_active=True
        ).first()
        if not prop:
            return jsonify({'error': 'Propiedad no encontrada'}), 404

        # Calcular promedio de calificación
        avg_rating = session.query(func.avg(PropertyRating.rating)).filter_by(
            property_address=prop.address,
            property_address_number=prop.address_number,
            property_floor=prop.floor,
            property_department=prop.department,
            property_city=prop.city,
            property_province=prop.province
        ).scalar()
        avg_rating = round(avg_rating, 2) if avg_rating is not None else None

        # Obtener imágenes activas asociadas a la propiedad
        images = session.query(PropertyImage).filter_by(
            property_address=prop.address,
            property_address_number=prop.address_number,
            property_floor=prop.floor,
            property_department=prop.department,
            property_city=prop.city,
            property_province=prop.province,
            is_active=True
        ).all()
        image_ids = [img.id for img in images]
        image_urls = [f"/property_images/{img.image_path}" for img in images] or ["/property_images/default.jpg"]
        image_filenames = [img.image_path for img in images]

        # Construir respuesta
        property_data = {
            'address': prop.address,
            'address_number': prop.address_number,
            'property_name': prop.property_name,
            'price_per_night': prop.price_per_night,
            'capacity': prop.capacity,
            'floor': prop.floor,
            'department': prop.department,
            'city': prop.city,
            'province': prop.province,
            'politica_de_cancelacion': prop.politica_de_cancelacion,
            'image_ids': image_ids,
            'image_urls': image_urls,
            'image_filenames': image_filenames,
            'average_rating': avg_rating
        }
        return jsonify({'property': property_data}), 200

@app.route('/rentals/booked-dates')
def get_booked_dates():
    address = request.args.get('address')
    address_number = request.args.get('address_number')
    with Session() as session:
        rentals = session.query(Rental).filter(
            Rental.property_address == address,
            Rental.property_address_number == address_number,
            Rental.status == 'activo'
        ).all()
        fechas = []
        for r in rentals:
            if r.fecha_tentativa_ingreso and r.fecha_tentativa_salida:
                # Genera todas las fechas ocupadas en el rango de la reserva
                d1 = r.fecha_tentativa_ingreso
                d2 = r.fecha_tentativa_salida
                while d1 < d2:
                    fechas.append(d1.strftime('%Y-%m-%d'))
                    d1 += timedelta(days=1)
        return jsonify({'fechas': fechas})
    
def send_email_reset_password(email):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Solicitud de restablecimiento de contraseña'

    body = f'''Hola,
    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AlquilerExpress.
    Si no solicitaste este cambio, ignora este mensaje.
    Para cambiar tu contraseña, clickea en el siguiente enlace:
    http://localhost:8000/views/passwordRecoveryForm.html?email={email}
    '''

    mensaje.attach(MIMEText(body, 'plain'))
    try:
        print(f"Enviando email a {destinatario}...")
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail: {e}")
        raise  # Propaga la excepción para que el endpoint la capture


@app.route('/sendEmailPasswordReset', methods=['POST'])
def send_email_password_reset():
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Debe rellenar el campo email'}), 400

        with Session() as session:
            user = session.query(User).filter_by(email=email).first()
            if not user:
                return jsonify({'error': 'El mail ingresado no se encuentra registrado'}), 404 
            send_email_reset_password(email)
            return jsonify({'message': 'Email enviado correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/reset_password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        new_password = data.get('new_password')
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        if not new_password:
            return jsonify({'error': 'New password is required'}), 400

        
        if not isinstance(new_password, str):
            return jsonify({'error': 'La contraseña debe ser un string'}), 400
        if not validate_password(new_password):
            return jsonify({'error': 'La contraseña debe tener entre 8 y 16 caracteres, una mayúscula y un caracter especial'}), 400

        with Session() as session:
            user = session.query(User).filter_by(email=email).first()
            if not user:
                return jsonify({'error': 'No user found with this email'}), 404
            if user.password == new_password:
                return jsonify({'error': 'La nueva contraseña no puede ser la misma que la actual'}), 400
            user.password = new_password
            session.commit()
            return jsonify({'message': 'Password reset successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/property/question', methods=['POST'])
def create_property_question():
    data = request.get_json()
    property_address = data.get('property_address')
    property_address_number = data.get('property_address_number')
    property_floor = data.get('property_floor')
    property_department = data.get('property_department')
    property_city = data.get('property_city')
    property_province = data.get('property_province')
    tenant_username = data.get('tenant_username')
    question_text = data.get('question_text')

    # Validar campos obligatorios
    if not all([property_address, property_address_number, property_floor, property_department, property_city, property_province, tenant_username, question_text]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    from datetime import date
    created_at = date.today()

    # Verificar que la propiedad exista
    with Session() as session:
        prop = session.query(Property).filter_by(
            address=property_address,
            address_number=property_address_number,
            floor=property_floor,
            department=property_department,
            city=property_city,
            province=property_province
        ).first()
        if not prop:
            return jsonify({'error': 'Propiedad no encontrada'}), 404

        # Verificar que el tenant exista
        tenant = session.query(Tenant).filter_by(username=tenant_username).first()
        if not tenant:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Buscar la última pregunta de este tenant en esta propiedad
        last_question = (
            session.query(PropertyQuestion)
            .filter_by(
                property_address=property_address,
                property_address_number=property_address_number,
                property_floor=property_floor,
                property_department=property_department,
                property_city=property_city,
                property_province=property_province,
                tenant_username=tenant_username,
                is_active=True 
            )
            .order_by(PropertyQuestion.created_at.desc(), PropertyQuestion.id.desc())
            .first()
        )

        # Si existe una pregunta previa sin respuesta, no permitir otra
        if last_question:
            answer = session.query(PropertyAnswer).filter_by(question_id=last_question.id).first()
            if not answer:
                return jsonify({'error': 'Debes esperar la respuesta del vendedor antes de hacer otra pregunta sobre esta propiedad.'}), 403

        # Crear la nueva pregunta
        question = PropertyQuestion(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            tenant_username=tenant_username,
            question_text=question_text,
            created_at=created_at
        )
        session.add(question)
        session.commit()
        return jsonify({'message': 'Pregunta agregada correctamente', 'question_id': question.id}), 201

@app.route('/property/answer', methods=['POST'])
def create_property_answer():
    data = request.get_json()
    question_id = data.get('question_id')
    answer_text = data.get('answer_text')
    employee_username = data.get('employee_username')

    # Validar campos obligatorios
    if not all([question_id, answer_text, employee_username]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    created_at = date.today()

    with Session() as session:
        # Verificar que el usuario sea empleado o gerente
        employee = session.query(Employee).filter_by(username=employee_username).first()
        manager = session.query(Manager).filter_by(username=employee_username).first()
        if not employee and not manager:
            return jsonify({'error': 'Solo empleados o gerentes pueden responder preguntas'}), 403

        # Verificar que la pregunta exista
        question = session.query(PropertyQuestion).filter_by(id=question_id).first()
        if not question:
            return jsonify({'error': 'Pregunta no encontrada'}), 404

        # Verificar que la pregunta no haya sido respondida
        existing_answer = session.query(PropertyAnswer).filter_by(question_id=question_id, is_active=True).first()
        if existing_answer:
            return jsonify({'error': 'Esta pregunta ya fue respondida'}), 400

        # Crear la respuesta
        answer = PropertyAnswer(
            question_id=question_id,
            answer_text=answer_text,
            employee_username=employee_username,
            created_at=created_at
        )
        session.add(answer)
        session.commit()
        return jsonify({'message': 'Respuesta agregada correctamente', 'answer_id': answer.id}), 201

@app.route('/property/questions', methods=['GET'])
def get_property_questions():
    property_address = request.args.get('property_address')
    property_address_number = request.args.get('property_address_number')
    property_floor = request.args.get('property_floor')
    property_department = request.args.get('property_department')
    property_city = request.args.get('property_city')
    property_province = request.args.get('property_province')

    with Session() as session:
        questions = session.query(PropertyQuestion).filter_by(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            is_active=True
        ).order_by(PropertyQuestion.created_at.asc()).all()

        result = []
        for q in questions:
            answer = session.query(PropertyAnswer).filter_by(question_id=q.id, is_active=True).first()
            result.append({
                'id': q.id,
                'tenant_username': q.tenant_username,
                'question_text': q.question_text,
                'created_at': q.created_at.strftime('%Y-%m-%d'),
                'answer': {
                    'id': answer.id,
                    'employee_username': answer.employee_username,
                    'answer_text': answer.answer_text,
                    'created_at': answer.created_at.strftime('%Y-%m-%d')
                } if answer else None
            })
        return jsonify(result)

@app.route('/property/question/delete', methods=['POST'])
def delete_property_question():
    data = request.get_json()
    question_id = data.get('question_id')
    admin_username = data.get('admin_username')

    if not question_id or not admin_username:
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    with Session() as session:
        # Solo empleados o gerentes pueden eliminar
        employee = session.query(Employee).filter_by(username=admin_username).first()
        manager = session.query(Manager).filter_by(username=admin_username).first()
        if not employee and not manager:
            return jsonify({'error': 'Solo empleados o gerentes pueden eliminar preguntas'}), 403

        question = session.query(PropertyQuestion).filter_by(id=question_id, is_active=True).first()
        if not question:
            return jsonify({'error': 'Pregunta no encontrada o ya eliminada'}), 404

        # Marcar pregunta como inactiva
        question.is_active = False

        # Si tiene respuesta, marcarla como inactiva también
        answer = session.query(PropertyAnswer).filter_by(question_id=question_id, is_active=True).first()
        if answer:
            answer.is_active = False

        session.commit()
        return jsonify({'message': 'Pregunta eliminada correctamente'}), 200

@app.route('/property/answer/delete', methods=['POST'])
def delete_property_answer():
    data = request.get_json()
    answer_id = data.get('answer_id')
    admin_username = data.get('admin_username')

    if not answer_id or not admin_username:
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    with Session() as session:
        # Solo empleados o gerentes pueden eliminar
        employee = session.query(Employee).filter_by(username=admin_username).first()
        manager = session.query(Manager).filter_by(username=admin_username).first()
        if not employee and not manager:
            return jsonify({'error': 'Solo empleados o gerentes pueden eliminar respuestas'}), 403

        answer = session.query(PropertyAnswer).filter_by(id=answer_id, is_active=True).first()
        if not answer:
            return jsonify({'error': 'Respuesta no encontrada o ya eliminada'}), 404

        # Marcar respuesta como inactiva
        answer.is_active = False
        session.commit()
        return jsonify({'message': 'Respuesta eliminada correctamente'}), 200

@app.route('/property/ratings', methods=['GET'])
def get_property_ratings():
    property_address = request.args.get('property_address')
    property_address_number = request.args.get('property_address_number')
    property_floor = request.args.get('property_floor')
    property_department = request.args.get('property_department')
    property_city = request.args.get('property_city')
    property_province = request.args.get('property_province')

    with Session() as session:
        ratings = session.query(PropertyRating).filter_by(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province
        ).all()

        result = []
        for r in ratings:
            result.append({
                'tenant_username': r.tenant_username,
                'rating': r.rating,
                'comment': r.comment
            })
        return jsonify(result), 200

@app.route('/property/rating', methods=['POST'])
def create_property_rating():
    data = request.get_json()
    property_address = data.get('property_address')
    property_address_number = data.get('property_address_number')
    property_floor = data.get('property_floor')
    property_department = data.get('property_department')
    property_city = data.get('property_city')
    property_province = data.get('property_province')
    tenant_username = data.get('tenant_username')
    rating = data.get('rating')
    comment = data.get('comment')

    # Validar campos obligatorios
    if not all([property_address, property_address_number, property_department, property_city, property_province, tenant_username, rating]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return jsonify({'error': 'La calificación debe ser entre 1 y 5'}), 400
    except Exception:
        return jsonify({'error': 'La calificación debe ser un número entero'}), 400

    with Session() as session:
        # Verificar que el usuario sea tenant
        tenant = session.query(Tenant).filter_by(username=tenant_username).first()
        if not tenant:
            return jsonify({'error': 'Solo los clientes pueden calificar propiedades.'}), 403

        # Verificar que la propiedad exista
        prop = session.query(Property).filter_by(
            address=property_address,
            address_number=property_address_number,
            floor=property_floor,
            department=property_department,
            city=property_city,
            province=property_province
        ).first()
        if not prop:
            return jsonify({'error': 'Propiedad no encontrada'}), 404

        # Verificar que el usuario no haya calificado antes esta propiedad
        existing = session.query(PropertyRating).filter_by(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            tenant_username=tenant_username
        ).first()
        if existing:
            return jsonify({'error': 'Ya has calificado esta propiedad.'}), 409

        # Crear la calificación
        new_rating = PropertyRating(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            tenant_username=tenant_username,
            rating=rating,
            comment=comment
        )
        session.add(new_rating)
        session.commit()
        return jsonify({'message': 'Calificación registrada correctamente'}), 201

@app.route('/property/tenant-rating', methods=['GET'])
def get_tenant_property_rating():
    property_address = request.args.get('property_address')
    property_address_number = request.args.get('property_address_number')
    property_floor = request.args.get('property_floor')
    property_department = request.args.get('property_department')
    property_city = request.args.get('property_city')
    property_province = request.args.get('property_province')
    tenant_username = request.args.get('tenant_username')

    with Session() as session:
        rating = session.query(PropertyRating).filter_by(
            property_address=property_address,
            property_address_number=property_address_number,
            property_floor=property_floor,
            property_department=property_department,
            property_city=property_city,
            property_province=property_province,
            tenant_username=tenant_username
        ).first()
        if rating:
            return jsonify({'rating': {
                'rating': rating.rating,
                'comment': rating.comment
            }}), 200
        else:
            return jsonify({'message': 'No hay calificación para esta propiedad'}), 404

def notificar_reservas_proximas():
    hoy = datetime.now().date()
    cinco_dias = hoy + timedelta(days=5)

    with Session() as session:
        rentals = session.query(Rental).filter(
            Rental.fecha_tentativa_ingreso == cinco_dias,
            Rental.status == 'activo'
        ).all()

        for rental in rentals:
            tenant = session.query(Tenant).filter_by(username=rental.tenant_username).first()
            if tenant and tenant.email:
                enviar_mail_reserva_proxima(tenant.email, rental)

def enviar_mail_reserva_proxima(email, rental):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Falta poco para tu reserva'

    body = f'''Hola,
    Queríamos recordarte que tu reserva para la propiedad {rental.property_address} {rental.property_address_number} comienza en 5 días.
    Detalles de la reserva:
    '''

    mensaje.attach(MIMEText(body, 'plain'))
    try:
        print(f"Enviando email a {destinatario}...")
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail: {e}")
        raise

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(notificar_reservas_proximas, 'interval', days=1)
    scheduler.start()
    app.run(debug=False)


@app.route('/test/notificar_reservas', methods=['POST'])
def test_notificar_reservas():
    notificar_reservas_proximas()
def get_user_profile():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Falta el nombre de usuario'}), 400

    try:
        with Session() as session:
            user = session.query(User).filter_by(username=username).first()
            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            tenant = session.query(Tenant).filter_by(username=username).first()
            employee = session.query(Employee).filter_by(username=username).first()
            manager = session.query(Manager).filter_by(username=username).first()

            profile_data = {
                'username': user.username,
                'email': user.email
            }

            if tenant:
                profile_data.update({
                    'role': 'tenant',
                    'first_name': tenant.first_name,
                    'last_name': tenant.last_name,
                    'dni': tenant.dni,
                    'birth_date': tenant.birth_date.strftime('%Y-%m-%d') if tenant.birth_date else None,
                    'phone': tenant.phone
                })
            elif manager:
                profile_data['role'] = 'manager'
            elif employee:
                profile_data['role'] = 'employee'
            else:
                profile_data['role'] = 'unknown'

            return jsonify(profile_data), 200
    except Exception as e:
        return jsonify({'error': f'Error al obtener el perfil: {str(e)}'}), 500

@app.route('/user_profile', methods=['GET'])
def get_user_profile():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Falta el nombre de usuario'}), 400

    try:
        with Session() as session:
            user = session.query(User).filter_by(username=username).first()
            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            tenant = session.query(Tenant).filter_by(username=username).first()
            employee = session.query(Employee).filter_by(username=username).first()
            manager = session.query(Manager).filter_by(username=username).first()

            profile_data = {
                'username': user.username,
                'email': user.email
            }

            if tenant:
                profile_data.update({
                    'role': 'tenant',
                    'first_name': tenant.first_name,
                    'last_name': tenant.last_name,
                    'dni': tenant.dni,
                    'birth_date': tenant.birth_date.strftime('%Y-%m-%d') if tenant.birth_date else None,
                    'phone': tenant.phone
                })
            elif manager:
                profile_data['role'] = 'manager'
            elif employee:
                profile_data['role'] = 'employee'
            else:
                profile_data['role'] = 'unknown'

            return jsonify(profile_data), 200
    except Exception as e:
        return jsonify({'error': f'Error al obtener el perfil: {str(e)}'}), 500

@app.route('/update_profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    username = data.get('username')
    new_username = data.get('new_username')
    field = data.get('field')
    value = data.get('value')
    current_password = data.get('current_password')

    # Validaciones según el campo
    if field == 'username':
        with Session() as session:
            existing_user = session.query(User).filter(User.username == new_username).first()
            if existing_user and existing_user.username != username:
                return jsonify({'error': 'El nombre de usuario ya está en uso'}), 400
        if not validate_username(new_username):
            return jsonify({'error': 'El nombre de usuario debe tener entre 3 y 50 caracteres, solo puede contener letras, números, puntos o guiones bajos, y no puede comenzar ni terminar con punto o guión bajo'}), 400

    elif field == 'password':
        if not validate_password(value):
            return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un caracter especial'}), 400
        if not current_password:
            return jsonify({'error': 'Debes ingresar tu contraseña actual'}), 400

    elif field == 'phone':
        if not validate_phone(value):
            return jsonify({'error': 'El teléfono debe contener solo números (puede comenzar con +) y tener entre 8 y 15 dígitos.'}), 400

    elif field == 'first_name':
        if not validate_name(value):
            return jsonify({'error': 'El nombre solo puede contener letras y espacios (máx. 50 caracteres).'}), 400

    elif field == 'last_name':
        if not validate_name(value):
            return jsonify({'error': 'El apellido solo puede contener letras y espacios (máx. 50 caracteres).'}), 400

    try:
        with Session() as session:
            user = session.query(User).filter(User.username == username).first()
            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            tenant = session.query(Tenant).filter(Tenant.username == username).first()
            employee = session.query(Employee).filter(Employee.username == username).first()
            manager = None
            if employee:
                manager = session.query(Manager).filter(Manager.username == username).first()

            if field == 'username':
                # Actualizar tablas relacionadas primero
                if tenant:
                    session.query(Tenant).filter(Tenant.username == username).update({Tenant.username: new_username})
                    session.query(Rental).filter(Rental.tenant_username == username).update({Rental.tenant_username: new_username})
                    session.query(PropertyRating).filter(PropertyRating.tenant_username == username).update({PropertyRating.tenant_username: new_username})
                    session.query(PropertyQuestion).filter(PropertyQuestion.tenant_username == username).update({PropertyQuestion.tenant_username: new_username})
                # Actualizar en users
                user.username = new_username
                session.commit()
                return jsonify({'message': 'Datos actualizados con éxito', 'new_username': new_username}), 200

            elif field == 'password':
                if user.password != current_password:
                    return jsonify({'error': 'La contraseña actual es incorrecta'}), 401
                user.password = value

            elif field == 'first_name' and tenant:
                tenant.first_name = value

            elif field == 'last_name' and tenant:
                tenant.last_name = value

            elif field == 'phone' and tenant:
                tenant.phone = value

            session.commit()

            if field == 'username':
                return jsonify({'message': 'Datos actualizados con éxito', 'new_username': new_username}), 200
            else:
                return jsonify({'message': 'Datos actualizados con éxito'}), 200

    except IntegrityError:
        return jsonify({'error': 'Error de integridad en la base de datos'}), 500
    except Exception as e:
        return jsonify({'error': f'Error al actualizar el perfil: {str(e)}'}), 500


@app.route('/delete/employee', methods=['POST'])
def delete_employee():
    data = request.get_json()
    username = data.get('username')
    admin_username = data.get('admin_username')
    
    if not username or not admin_username:
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    # Verificar que quien realiza la operación sea un gerente
    with Session() as session:
        admin = session.query(Manager).filter_by(username=admin_username).first()
        if not admin:
            return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403

        # Verificar si el usuario existe y es un empleado/gerente
        user = session.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # No permitir que un gerente se elimine a sí mismo
        if username == admin_username:
            return jsonify({'error': 'No puedes eliminarte a ti mismo como gerente'}), 403
        
        # Verificar si ya está marcado como inactivo
        if username.startswith('**'):
            return jsonify({'error': 'Este usuario ya se encuentra dado de baja'}), 400
            
        # Verificar si es gerente o empleado
        manager = session.query(Manager).filter_by(username=username).first()
        employee = session.query(Employee).filter_by(username=username).first()
        
        if not manager and not employee:
            return jsonify({'error': 'La cuenta no pertenece a un gerente o empleado'}), 404
        
        # Marcar como inactivo anteponiendo '**' al username
        new_username = f"**{username}"
        
        # Actualizar todas las tablas relacionadas
        if manager:
            # Actualizar el username en la tabla managers
            session.query(Manager).filter_by(username=username).update({Manager.username: new_username})
        
        if employee:
            # Actualizar el username en la tabla employees
            session.query(Employee).filter_by(username=username).update({Employee.username: new_username})
        
        # Actualizar el username en la tabla users
        session.query(User).filter_by(username=username).update({User.username: new_username})
        
        # Actualizar cualquier otra tabla donde este usuario pueda tener referencias
        # Por ejemplo, PropertyAnswer (si el empleado respondió preguntas)
        session.query(PropertyAnswer).filter_by(employee_username=username).update({PropertyAnswer.employee_username: new_username})
        
        session.commit()
        return jsonify({'message': 'Baja realizada con éxito'}), 200

@app.route('/check_employee_exists', methods=['GET'])
def check_employee_exists():
    username = request.args.get('username')
    
    if not username:
        return jsonify({'exists': False, 'error': 'Por favor, ingresa un nombre de usuario'}), 400
    
    with Session() as session:
        # Verificar si ya está marcado como inactivo
        if username.startswith('**'):
            return jsonify({'exists': False, 'error': 'Este usuario ya se encuentra dado de baja'}), 200
            
        user = session.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'exists': False, 'error': 'Usuario no encontrado'}), 200
            
        # Verificar si es gerente o empleado
        manager = session.query(Manager).filter_by(username=username).first()
        employee = session.query(Employee).filter_by(username=username).first()
        
        if not manager and not employee:
            return jsonify({'exists': False, 'error': 'La cuenta no pertenece a un gerente o empleado'}), 200
        
        # Si llega aquí, el usuario existe y es un empleado o gerente activo
        return jsonify({'exists': True, 'username': username}), 200


# Eliminación física - Comentar este endpoint antes de la demo
@app.route('/permanent_delete/employee', methods=['POST'])
def permanent_delete_employee():
    data = request.get_json()
    username = data.get('username')
    admin_username = data.get('admin_username')
    
    if not username or not admin_username:
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    with Session() as session:
        admin = session.query(Manager).filter_by(username=admin_username).first()
        if not admin:
            return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403
        
        # Buscar el usuario a eliminar (puede estar activo o inactivo)
        pattern = username
        if not username.startswith('**'):
            pattern = f"**{username}" # También buscar versión inactiva
            
        user = session.query(User).filter(
            (User.username == username) | (User.username == pattern)
        ).first()
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar si es gerente o empleado
        target_username = user.username
        manager = session.query(Manager).filter_by(username=target_username).first()
        employee = session.query(Employee).filter_by(username=target_username).first()
        
        if not manager and not employee:
            return jsonify({'error': 'La cuenta no pertenece a un gerente o empleado'}), 404
        
        try:
            # Eliminar registros en tablas relacionadas
            if manager:
                session.query(Manager).filter_by(username=target_username).delete()
            
            if employee:
                session.query(PropertyAnswer).filter_by(employee_username=target_username).delete()
                session.query(Employee).filter_by(username=target_username).delete()
            
            # Eliminar el usuario base
            session.query(User).filter_by(username=target_username).delete()
            
            session.commit()
            return jsonify({'message': 'Usuario eliminado permanentemente con éxito'}), 200
            
        except Exception as e:
            session.rollback()
            return jsonify({'error': f'Error al eliminar: {str(e)}'}), 500

@app.route('/tenants/search', methods=['GET'])
def search_tenants():
    query = request.args.get('query', '').strip()
    if not query or len(query) < 2:
        return jsonify({'tenants': []})

    with Session() as session:
        tenants = session.query(Tenant).filter(
            Tenant.username.ilike(f'%{query}%')
        ).limit(10).all()
        result = [{'username': t.username, 'first_name': t.first_name, 'last_name': t.last_name} for t in tenants]
        return jsonify({'tenants': result})

@app.route('/edit/employee', methods=['POST'])
def edit_employee():
    data = request.get_json()
    username = data.get('username')
    field = data.get('field')
    value = data.get('value')
    admin_username = data.get('admin_username')
    
    if not username or not field or not value or not admin_username:
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    # Verificar que quien realiza la operación sea un gerente
    with Session() as session:
        admin = session.query(Manager).filter_by(username=admin_username).first()
        if not admin:
            return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403
        
        # Verificar que el empleado exista
        user = session.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        # Verificar si es gerente o empleado
        manager = session.query(Manager).filter_by(username=username).first() is not None
        employee = session.query(Employee).filter_by(username=username).first() is not None
        
        if not manager and not employee:
            return jsonify({'error': 'La cuenta no pertenece a un gerente o empleado'}), 404
        
        try:
            if field == 'username':
                # Validar el nuevo nombre de usuario
                if not validate_username(value):
                    return jsonify({'error': 'El nombre de usuario debe tener entre 3 y 50 caracteres, solo puede contener letras, números, puntos o guiones bajos, y no puede comenzar ni terminar con punto o guión bajo'}), 400
                
                # Verificar que el nuevo username no exista ya
                existing_user = session.query(User).filter(User.username == value).first()
                if existing_user and existing_user.username != username:
                    return jsonify({'error': 'El nombre de usuario ya está en uso'}), 400
                
                # Actualizar en todas las tablas relacionadas
                new_username = value
                if manager:
                    session.query(Manager).filter_by(username=username).update({Manager.username: new_username})
                if employee:
                    session.query(Employee).filter_by(username=username).update({Employee.username: new_username})
                    session.query(PropertyAnswer).filter_by(employee_username=username).update({PropertyAnswer.employee_username: new_username})
                
                session.query(User).filter_by(username=username).update({User.username: new_username})
                
                session.commit()
                return jsonify({'message': 'Datos actualizados con éxito', 'new_username': new_username}), 200
                
            elif field == 'email':
                # Validar el nuevo correo
                if not validate_email(value):
                    return jsonify({'error': 'El correo electrónico ingresado no es válido'}), 400
                
                # Verificar que el email no esté en uso por otro usuario
                existing_email = session.query(User).filter(User.email == value, User.username != username).first()
                if existing_email:
                    return jsonify({'error': 'El correo electrónico ya está en uso'}), 400

                # Generar nueva contraseña aleatoria
                new_password = ''.join(secrets.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()') for _ in range(10))
                new_password = f"{new_password}A!"  # Asegurarse que cumpla los requisitos
                
                # Actualizar el correo y la contraseña
                user.email = value
                user.password = new_password
                session.commit()
                
                # Enviar correo con los nuevos datos
                enviar_mail_bienvenida(value, username, new_password)
                
                return jsonify({'message': 'Correo actualizado y nueva contraseña enviada con éxito'}), 200
                
            elif field == 'password':
                # Validar la nueva contraseña
                if not validate_password(value):
                    return jsonify({'error': 'La contraseña debe contener al menos 8 caracteres, una mayúscula y un caracter especial'}), 400
                
                # Actualizar la contraseña directamente sin verificar la contraseña actual
                user.password = value
                session.commit()
                
                return jsonify({'message': 'Contraseña actualizada con éxito'}), 200
            elif field == 'role':
                # Nuevo código para cambiar el rol
                new_role = value
                
                # Validar que el rol sea válido
                if new_role not in ['manager', 'employee']:
                    return jsonify({'error': 'Rol no válido'}), 400
                
                # Un gerente no puede modificar su propio rol a empleado
                if manager and admin_username == username and new_role == 'employee':
                    return jsonify({'error': 'No puedes modificar tu propio rol a empleado'}), 403

                # Verificar si ya tiene ese rol 
                if (new_role == 'manager' and manager) or (new_role == 'employee' and employee and not manager):
                    return jsonify({'error': 'El trabajador ya posee ese rol'}), 400
                
                # Cambiar el rol
                if new_role == 'manager':
                        if not manager:
                            # Asegurarse de que existe como empleado
                            if not employee:
                                session.add(Employee(username=username, password=user.password, email=user.email))
                                session.flush()
                            # Insertar solo el registro en managers usando text()
                            session.execute(
                                text("INSERT INTO managers (username) VALUES (:username)"),
                                {'username': username}
                            )
                elif new_role == 'employee':
                    # Si es manager, quitarle ese rol (asegurarse de que haya al menos un manager activo)
                    if manager:
                        # Contar gerentes activos (excluyendo el actual)
                        active_managers_count = session.query(Manager).filter(
                            Manager.username != username,
                            ~Manager.username.like('**%')
                        ).count()
                        
                        if active_managers_count == 0:
                            return jsonify({'error': 'No se puede degradar al único gerente activo'}), 400
                        
                        # Eliminar el registro de manager
                        session.query(Manager).filter_by(username=username).delete()
                        
                        # Asegurarse de que existe como empleado
                        if not employee:
                            new_employee = Employee(username=username, password=user.password, email=user.email)
                            session.add(new_employee)
                session.commit()
                return jsonify({'message': f'Rol actualizado a {new_role} correctamente'}), 200
            else:
                return jsonify({'error': 'Campo no válido para actualizar'}), 400
                
        except IntegrityError:
            session.rollback()
            return jsonify({'error': 'Error de integridad en la base de datos'}), 500
        except Exception as e:
            session.rollback()
            return jsonify({'error': f'Error al actualizar el perfil: {str(e)}'}), 500

@app.route('/searchRentals', methods=['GET'])
def search_rentals():
    dni = request.args.get('dni')
    city = request.args.get('city')
    province = request.args.get('province')
    sin_entrega_llave = request.args.get('sin_entrega_llave', 'false').lower() == 'true'
    sin_devolucion_llave = request.args.get('sin_devolucion_llave', 'false').lower() == 'true'
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 9))

    with Session() as session:
        total_rentals = session.query(Rental).count()
        query = session.query(Rental)

        # Filtrar por DNI (requiere join con Tenant)
        if dni:
            tenants = session.query(Tenant).filter(Tenant.dni == dni).all()
            tenant_usernames = [t.username for t in tenants]
            if tenant_usernames:
                query = query.filter(Rental.tenant_username.in_(tenant_usernames))
            else:
                return jsonify({
                    'rentals': [],
                    'message': 'No hay alquileres que coincidan con los filtros de búsqueda seleccionados.' if total_rentals > 0 else 'No hay alquileres cargados actualmente.',
                    'total': total_rentals
                })

        if city:
            query = query.filter(Rental.property_city.ilike(f'%{city}%'))
        if province:
            query = query.filter(Rental.property_province.ilike(f'%{province}%'))
        if sin_entrega_llave:
            query = query.filter(Rental.fecha_entrega_llave.is_(None))
        if sin_devolucion_llave:
            query = query.filter(Rental.fecha_devolucion_llave.is_(None))

        total_filtered = query.count()
        rentals = query.order_by(Rental.id.desc()).offset((page - 1) * per_page).limit(per_page).all()

        if not rentals:
            mensaje = 'No hay alquileres que coincidan con los filtros de búsqueda seleccionados.' if total_rentals > 0 else 'No hay alquileres cargados actualmente.'
            return jsonify({'rentals': [], 'message': mensaje, 'total': total_filtered})

        result = []
        for r in rentals:
            tenant = session.query(Tenant).filter_by(username=r.tenant_username).first()
            property_obj = session.query(Property).filter_by(
                address=r.property_address,
                address_number=r.property_address_number,
                floor=r.property_floor,
                department=r.property_department,
                city=r.property_city,
                province=r.property_province
            ).first()
            result.append({
                'id': r.id,
                'status': r.status,
                'fecha_entrega_llave': r.fecha_entrega_llave.strftime('%Y-%m-%d') if r.fecha_entrega_llave else None,
                'fecha_devolucion_llave': r.fecha_devolucion_llave.strftime('%Y-%m-%d') if r.fecha_devolucion_llave else None,
                'fecha_tentativa_ingreso': r.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if r.fecha_tentativa_ingreso else None,
                'fecha_tentativa_salida': r.fecha_tentativa_salida.strftime('%Y-%m-%d') if r.fecha_tentativa_salida else None,
                'property_address': r.property_address,
                'property_address_number': r.property_address_number,
                'property_floor': r.property_floor,
                'property_department': r.property_department,
                'property_city': r.property_city,
                'property_province': r.property_province,
                'property_name': property_obj.property_name if property_obj else '',
                'tenant_username': r.tenant_username,
                'tenant_first_name': tenant.first_name if tenant else '',
                'tenant_last_name': tenant.last_name if tenant else '',
                'tenant_dni': tenant.dni if tenant else '',
                'tenant_phone': tenant.phone if tenant else '',
                'tenant_email': tenant.email if tenant else '',
                'cantidad_personas': r.cantidad_personas,
                'total': r.total
            })
        return jsonify({'rentals': result, 'total': total_filtered})
    

def enviar_mail_cancelacion_por_edicion(email, username, oldAddress, oldAddressNumber, oldCity, oldProvince, oldFloor, oldDepartment, newAddress, newAddressNumber, newCity, newProvince, newFloor, newDepartment, oldCapacity, newCapacity):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Modificacion en la propiedad de la reserva - Alquiler Express'

    body = f'''Hola {username},
    Hola,
    Le notificamos que la propiedad {oldAddress} {oldAddressNumber}, {oldFloor}° piso, {oldDepartment}, {oldCity}, {oldProvince}, con capacidad para {oldCapacity} personas, tenia mal asignada la dirección y ha sido editada.
    Ahora se encuentra en {newAddress} {newAddressNumber}, {newFloor}° piso, {newDepartment}, {newCity}, {newProvince}, con capacidad para {newCapacity} personas.
    Si desea cancelar su reserva, por favor contáctenos a través de nuestro correo electrónico o número de teléfono y se le sera reembolsado el total abonado.
    Muchas gracias por su comprensión.
    Saludos,
    Alquiler Express
    '''

    mensaje.attach(MIMEText(body, 'plain'))

    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail de confirmación de reserva: {e}")



@app.route('/edit_property', methods=['POST'])
def edit_property():
    data = request.get_json()
    address = data.get('address')
    address_number = data.get('address_number')
    property_name = data.get('property_name')
    price_per_night = data.get('price_per_night')
    capacity = data.get('capacity')
    floor = data.get('floor')
    department = data.get('department')
    city = data.get('city')
    province = data.get('province')
    oldAddress = data.get('old_address')
    oldAddressNumber = data.get('old_address_number')
    oldFloor = data.get('old_floor')
    oldDepartment = data.get('old_department')
    oldCity = data.get('old_city')
    oldProvince = data.get('old_province')
    oldCapacity = data.get('old_capacity')

    oldAddress = oldAddress.strip().lower() if oldAddress else None
    oldDepartment = oldDepartment.strip().lower() if oldDepartment not in [None, '', 'n/a'] else 'n/a'
    oldCity = oldCity.strip().lower() if oldCity else None
    oldProvince = oldProvince.strip().lower() if oldProvince else None
    try:
        oldFloor = int(oldFloor)
    except (TypeError, ValueError):
        oldFloor = 0
    try:
        oldAddressNumber = int(oldAddressNumber)
    except (TypeError, ValueError):
        oldAddressNumber = None

    required_fields = [address, address_number, floor, department, city, province, property_name, price_per_night, capacity]
    for field, name in zip(required_fields, ['address', 'address_number', 'floor', 'department', 'city', 'province', 'property_name']):
        if field is None or (isinstance(field, str) and field.strip() == ''):
            return jsonify({'error': 'Por favor, complete todos los campos'}), 400
    if not isinstance(capacity, int) or capacity <= 0:
        return jsonify({'error': 'La capacidad debe ser un número entero positivo'}), 400
    if not isinstance(price_per_night, (int, float)) or price_per_night < 0:
        return jsonify({'error': 'El precio por noche debe ser un número positivo'}), 400

    address = address.strip().lower() if address else None
    department = department.strip().lower() if department else 'n/a'
    city = city.strip().lower() if city else None
    province = province.strip().lower() if province else None
    try:
        floor = int(floor)
    except (TypeError, ValueError):
        floor = 0
    try:
        address_number = int(address_number)
    except (TypeError, ValueError):
        address_number = None
    try:
        price_per_night = float(price_per_night)
    except (TypeError, ValueError):
        price_per_night = 0
    try:
        capacity = int(capacity)
    except (TypeError, ValueError):
        capacity = 0
    property_name = property_name.strip() if property_name else None

    with Session() as session:
        prop = session.query(Property).filter_by(
            address=oldAddress,
            address_number=oldAddressNumber,
            floor=oldFloor,
            department=oldDepartment,
            city=oldCity,
            province=oldProvince
        ).first()
        if not prop:
            return jsonify({'error': 'Propiedad no fue encontrada'}), 404   
        
        prop.city = city
        prop.province = province       
        prop.address = address
        prop.address_number = address_number
        prop.floor = floor
        prop.department = department
        prop.property_name = property_name
        prop.price_per_night = price_per_night
        prop.capacity = capacity

        imgIds = []

        images = session.query(PropertyImage).filter_by(
            property_address=oldAddress,
            property_address_number=oldAddressNumber,
            property_floor=oldFloor,
            property_department=oldDepartment,
            property_city=oldCity,
            property_province=oldProvince
        ).all()
        for img in images:
            img.property_address = address
            img.property_address_number = address_number
            img.property_floor = floor
            img.property_department = department
            img.property_city = city
            img.property_province = province
        print('\n', address, address_number, floor, department, city, province)
        print('\n', oldAddress, oldAddressNumber, oldFloor, oldDepartment, oldCity, oldProvince)
        if(address != oldAddress) or (address_number != oldAddressNumber) or (floor != oldFloor) or (department != oldDepartment) or (city != oldCity) or (province != oldProvince) or (capacity < oldCapacity):
            print("Actualizando reservas relacionadas...")
            rentals = session.query(Rental).filter(
                Rental.property_address == oldAddress,
                Rental.property_address_number == oldAddressNumber,
                Rental.property_floor == oldFloor,
                Rental.property_department == oldDepartment,
                Rental.property_city == oldCity,
                Rental.property_province == oldProvince
            ).all()
            for rental in rentals:
                rental.property_address = address
                rental.property_address_number = address_number
                rental.property_floor = floor
                rental.property_department = department
                rental.property_city = city
                rental.property_province = province
                if (rental.cantidad_personas > capacity):
                    rental.cantidad_personas = capacity
                username = rental.tenant_username
                user = session.query(User).filter_by(username=username).first()
                if user:
                    enviar_mail_cancelacion_por_edicion(user.email, username, oldAddress, oldAddressNumber, oldCity, oldProvince, oldFloor, oldDepartment, address, address_number, floor, department, city, province, oldCapacity, capacity)
        session.commit()
        return jsonify({'message': 'Propiedad actualizada correctamente'}), 200
    
@app.route('/delete/property-images', methods=['POST'])
def delete_property_images():
    data = request.get_json()
    image_ids = data.get('image_ids')
    address = data.get('address')
    address_number = data.get('address_number')
    floor = data.get('floor')
    department = data.get('department')
    city = data.get('city')
    province = data.get('province')

    with Session() as session:
        if image_ids and isinstance(image_ids, list):
            images = session.query(PropertyImage).filter(PropertyImage.id.in_(image_ids)).all()
            if not images:
                return jsonify({'error': 'No se encontraron imágenes con los IDs proporcionados'}), 404
        elif all([address, address_number, floor, department, city, province]):
            images = session.query(PropertyImage).filter_by(
                property_address=address,
                property_address_number=address_number,
                property_floor=floor,
                property_department=department,
                property_city=city,
                property_province=province
            ).all()
            if not images:
                return jsonify({'error': 'No se encontraron imágenes para esta propiedad'}), 404
        else:
            return jsonify({'error': 'Debe proporcionar una lista de IDs o los datos completos de la propiedad'}), 400

        for img in images:
            img.is_active = False
        session.commit()
        return jsonify({'message': 'Imágenes dadas de baja lógicamente'}), 200

def send_email_cleaning(email, address, address_number):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Limpieza requerida - Alquiler Express'

    body = f'''Hola ,
    Se ha registrado la devolución de llave para la propiedad ubicada en {address} {address_number}.
    Por favor, proceda a realizar la limpieza correspondiente.
    Alquiler Express
    '''
    mensaje.attach(MIMEText(body, 'plain'))

    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail de confirmación de reserva: {e}")

@app.route('/rentals/key_handover', methods=['POST'])
def register_key_handover():
    data = request.get_json()
    rental_id = data.get('rental_id')
    tenant_dni = data.get('dni')
    
    if not rental_id or not tenant_dni:
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    with Session() as session:
        # Obtener la reserva
        rental = session.query(Rental).filter_by(id=rental_id).first()
        if not rental:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        # Verificar que la reserva esté activa
        if rental.status != 'activo':
            return jsonify({'error': 'La reserva no está activa'}), 400
        
        # Verificar que la llave no haya sido entregada ya (Regla 2)
        if rental.fecha_entrega_llave:
            return jsonify({'error': 'La llave ya fue entregada'}), 400
        
        # NUEVA VALIDACIÓN: Verificar que estamos en fecha permitida (mismo día o un día antes)
        fecha_actual = datetime.now().date()
        fecha_inicio_alquiler = rental.fecha_tentativa_ingreso
        
        # Si la fecha actual es más de 1 día antes del inicio, rechazar
        if fecha_actual < fecha_inicio_alquiler - timedelta(days=1):
            dias_restantes = (fecha_inicio_alquiler - fecha_actual).days
            return jsonify({
                'error': f'La llave solo puede ser entregada el día del inicio del alquiler o un día antes.'
            }), 400
        
        # Obtener el tenant para verificar DNI (Regla 1)
        tenant = session.query(Tenant).filter_by(username=rental.tenant_username).first()
        if not tenant:
            return jsonify({'error': 'Inquilino no encontrado'}), 404
        
        # Normalizar ambos DNIs para comparación (eliminar espacios y convertir a string)
        tenant_dni_stored = str(tenant.dni).strip()
        tenant_dni_input = str(tenant_dni).strip()
        
        # Verificar que el DNI coincida (Escenario 3)
        if tenant_dni_stored != tenant_dni_input:
            return jsonify({'error': 'El DNI ingresado es incorrecto'}), 400
        
        # Registrar entrega de llave (Escenario 1)
        rental.fecha_entrega_llave = datetime.now()
        session.commit()
        return jsonify({
            'message': 'Entrega de llave registrada con éxito',
            'fecha_entrega': rental.fecha_entrega_llave.strftime('%Y-%m-%d %H:%M:%S')
        }), 200

@app.route('/rentals/key_return', methods=['POST'])
def register_key_return():
    data = request.get_json()
    rental_id = data.get('rental_id')
    tenant_dni = data.get('dni')
    motivo_devolucion_temprana = data.get('motivo_devolucion_temprana')
    
    if not rental_id or not tenant_dni:
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    with Session() as session:
        # Obtener la reserva
        rental = session.query(Rental).filter_by(id=rental_id).first()
        address = rental.property_address if rental else None
        address_number = rental.property_address_number if rental else None
        if not rental:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        # Verificar que la reserva esté activa
        if rental.status != 'activo':
            return jsonify({'error': 'La reserva no está activa'}), 400
        
        # Verificar que la llave haya sido entregada (Regla 1)
        if not rental.fecha_entrega_llave:
            return jsonify({'error': 'No se ha registrado la entrega de la llave para esta reserva'}), 400
        
        # Verificar que la llave no haya sido devuelta (Regla 2)
        if rental.fecha_devolucion_llave:
            fecha_devolucion = rental.fecha_devolucion_llave.strftime('%d-%m-%Y')
            return jsonify({'error': f'La devolución de la llave ya se encontraba registrada el día {fecha_devolucion}'}), 400
        
        # Obtener el tenant para verificar DNI (Regla 1)
        tenant = session.query(Tenant).filter_by(username=rental.tenant_username).first()
        if not tenant:
            return jsonify({'error': 'Inquilino no encontrado'}), 404
        
        # Normalizar ambos DNIs para comparación
        tenant_dni_stored = str(tenant.dni).strip()
        tenant_dni_input = str(tenant_dni).strip()
        
        # Verificar que el DNI coincida (Escenario 5)
        if tenant_dni_stored != tenant_dni_input:
            return jsonify({'error': 'El DNI ingresado es incorrecto'}), 400
        
        fecha_actual = datetime.now()
        
        # Verificar si es devolución temprana (Escenario 2)
        es_devolucion_temprana = False
        if rental.fecha_tentativa_salida and rental.fecha_tentativa_salida > fecha_actual.date():
            es_devolucion_temprana = True
            
            # Si es devolución temprana, verificar que tenga motivo
            if not motivo_devolucion_temprana:
                return jsonify({'error': 'Para una devolución anticipada, debe indicar el motivo'}), 400
                
            # Actualizar fecha de salida a la actual
            rental.fecha_tentativa_salida = fecha_actual.date()
            # Guardar el motivo de devolución temprana
            rental.motivo_devolucion_temprana = motivo_devolucion_temprana
        
        # Registrar devolución de llave (Escenario 1 y 2)
        rental.fecha_devolucion_llave = fecha_actual
        
        # Cambiar el estado de la reserva a finalizado
        rental.status = 'finalizado'
        
        session.commit()

        employees = session.query(Employee).all()
        for employee in employees:
            send_email_cleaning(employee.email, address, address_number)        
        
        mensaje = 'Devolución de la llave registrada con éxito'
            
        return jsonify({
            'message': mensaje,
            'fecha_devolucion': rental.fecha_devolucion_llave.strftime('%Y-%m-%d %H:%M:%S'),
            'es_devolucion_temprana': es_devolucion_temprana
        }), 200

@app.route('/rental/<int:rental_id>', methods=['GET'])
def get_rental_by_id(rental_id):
    with Session() as session:
        rental = session.query(Rental).filter_by(id=rental_id).first()
        if not rental:
            return jsonify({'error': 'Reserva no encontrada'}), 404
            
        return jsonify({
            'rental': {
                'id': rental.id,
                'status': rental.status,
                'fecha_entrega_llave': rental.fecha_entrega_llave.strftime('%Y-%m-%d') if rental.fecha_entrega_llave else None,
                'fecha_devolucion_llave': rental.fecha_devolucion_llave.strftime('%Y-%m-%d') if rental.fecha_devolucion_llave else None,
                'fecha_tentativa_ingreso': rental.fecha_tentativa_ingreso.strftime('%Y-%m-%d') if rental.fecha_tentativa_ingreso else None,
                'fecha_tentativa_salida': rental.fecha_tentativa_salida.strftime('%Y-%m-%d') if rental.fecha_tentativa_salida else None,
                'property_address': rental.property_address,
                'property_address_number': rental.property_address_number,
                'property_floor': rental.property_floor,
                'property_department': rental.property_department,
                'property_city': rental.property_city,
                'property_province': rental.property_province,
                'tenant_username': rental.tenant_username,
                'motivo_devolucion_temprana': rental.motivo_devolucion_temprana,
                'cantidad_personas': rental.cantidad_personas,
                'total': rental.total
            }
        })
    

@app.route('/delete/property', methods=['POST'])
def delete_property():
    data = request.get_json()
    address = data.get('address')
    address_number = data.get('address_number')
    floor = data.get('floor')
    department = data.get('department')
    city = data.get('city')
    province = data.get('province')

    if not all([address, address_number, floor, department, city, province]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    with Session() as session:
        property_to_delete = session.query(Property).filter_by(
            address=address,
            address_number=address_number,
            floor=floor,
            department=department,
            city=city,
            province=province
        ).first()

        if not property_to_delete:
            return jsonify({'error': 'Propiedad no encontrada'}), 404
        
        # Verificar si hay reservas activas para esta propiedad
        active_rentals = session.query(Rental).filter(
            Rental.property_address == address,
            Rental.property_address_number == address_number,
            Rental.property_floor == floor,
            Rental.property_department == department,
            Rental.property_city == city,
            Rental.property_province == province,
            Rental.status == 'activo'
        ).all()
        for rental in active_rentals:
            tenant = session.query(Tenant).filter_by(username=rental.tenant_username).first()
            if tenant:
                enviar_mail_cancelacion_por_edicion(tenant.email, tenant.username)
            rental.status = 'cancelado'
        
        # Marcar la propiedad como inactiva
        property_to_delete.is_active = False
        
        # Actualizar las imágenes de la propiedad a inactivas
        images = session.query(PropertyImage).filter_by(
            property_address=address,
            property_address_number=address_number,
            property_floor=floor,
            property_department=department,
            property_city=city,
            property_province=province
        ).all()
        
        for img in images:
            img.is_active = False
            
        session.commit()
        
        return jsonify({'message': 'Propiedad eliminada correctamente'}), 200
    
def send_cancelation_email_maintenance(email, username):
    remitente = 'alquilerexpress620@gmail.com'
    clave = 'vtys xltx eerm evhm'
    destinatario = email

    mensaje = MIMEMultipart()
    mensaje['From'] = remitente
    mensaje['To'] = destinatario
    mensaje['Subject'] = 'Cancelacion de la reserva - Alquiler Express'

    body = f'''Hola {username},
    Lamentamos informarte que tu reserva ha sido cancelada debido a la asignación de mantenimiento a la propiedad.
    Le retornaremos la totalidad de lo abonado.
    Disculpe las molestias ocasionadas.
    -Alquiler Express
    '''
    mensaje.attach(MIMEText(body, 'plain'))

    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
        smtp_server.starttls()
        smtp_server.login(remitente, clave)
        smtp_server.sendmail(remitente, destinatario, mensaje.as_string())
        smtp_server.quit()
    except Exception as e:
        print(f"Error enviando mail de confirmación de reserva: {e}")



@app.route('/assign/maintenance', methods=['POST'])
def assign_maintenance():
    data = request.get_json()
    address = data.get('address')
    address_number = data.get('address_number')
    floor = data.get('floor')
    department = data.get('department')
    city = data.get('city')
    province = data.get('province')

    if not all([address, address_number, floor, department, city, province]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    with Session() as session:
        property_to_assign = session.query(Property).filter_by(
            address=address,
            address_number=address_number,
            floor=floor,
            department=department,
            city=city,
            province=province
        ).first()

        rentals = session.query(Rental).filter(
            Rental.property_address == address,
            Rental.property_address_number == address_number,
            Rental.property_floor == floor,
            Rental.property_department == department,
            Rental.property_city == city,
            Rental.property_province == province,
            Rental.status == 'activo'
        ).all()

        for rental in rentals:
            tenant = session.query(Tenant).filter_by(username=rental.tenant_username).first()
            if tenant:
                send_cancelation_email_maintenance(tenant.email, tenant.username)
            rental.status = 'cancelado'

        if not property_to_assign:
            return jsonify({'error': 'Propiedad no encontrada'}), 404
        
        property_to_assign.on_maintenance = True
        session.commit()
        return jsonify({'message': 'Mantenimiento asignado correctamente a la propiedad'}), 200
    

@app.route('/assign/operational', methods=['POST'])
def assign_operational():
    data = request.get_json()
    address = data.get('address')
    address_number = data.get('address_number')
    floor = data.get('floor')
    department = data.get('department')
    city = data.get('city')
    province = data.get('province')

    if not all([address, address_number, floor, department, city, province]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    with Session() as session:
        property_to_assign = session.query(Property).filter_by(
            address=address,
            address_number=address_number,
            floor=floor,
            department=department,
            city=city,
            province=province
        ).first()

        if not property_to_assign:
            return jsonify({'error': 'Propiedad no encontrada'}), 404
        
        property_to_assign.on_maintenance = False
        session.commit()
        return jsonify({'message': 'Propiedad asignada como operativa correctamente'}), 200
    
@app.route('/statistics/new_users', methods=['GET'])
def get_user_statistics():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    print(start_date, end_date)
    
    if(not start_date or not end_date):
        return jsonify({'error': 'Debe proporcionar las fechas de inicio y fin.'}), 400

    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        end_date_with_time = datetime.combine(end_date, datetime.max.time())
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400
    
    try:
        with Session() as session:
            tenants = session.query(Tenant).filter(
                Tenant.created_at.between(start_date,end_date_with_time)
            ).all()
            
            tenant_data = []
            daily_counts = {}
            
            # Inicializar contador por día
            date_range = (end_date - start_date).days + 1
            for i in range(date_range):
                current_date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
                daily_counts[current_date] = 0
            
            # Procesar cada tenant
            for tenant in tenants:
                fecha_str = tenant.created_at.strftime('%Y-%m-%d')
                tenant_data.append({
                    'username': tenant.username,
                    'email': tenant.email,
                    'fecha_registro': fecha_str,
                    'tipo': 'tenant'  # Siempre es tenant en este caso
                })
                
                # Contar por día
                if fecha_str in daily_counts:
                    daily_counts[fecha_str] += 1
            
            return jsonify({
                'total_usuarios': len(tenant_data),
                'usuarios': tenant_data,
                'conteo_por_tipo': {'tenant': len(tenant_data)},
                'conteo_diario': daily_counts,
                'fechas': list(daily_counts.keys())
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/statistics/money_deposited', methods=['GET'])
def get_money_deposited_statistics():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Debe proporcionar las fechas de inicio y fin.'}), 400

    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        end_date_with_time = datetime.combine(end_date_obj, datetime.max.time())
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400

    try:
        with Session() as session:
            # Consultar alquileres en el rango de fechas
            rentals = session.query(Rental).filter(
                Rental.created_at.between(start_date_obj, end_date_with_time)
            ).all()

            # Diccionario para almacenar montos por día
            daily_amounts = {}
            
            # Inicializar contador por día (con 0 para cada día en el rango)
            date_range = (end_date_obj - start_date_obj).days + 1

            for i in range(date_range):
                current_date = (start_date_obj + timedelta(days=i)).strftime('%Y-%m-%d')
                daily_amounts[current_date] = 0
            
            # Detalles de los depósitos para la respuesta
            deposits_details = []
            total_deposited = 0

            # Procesar cada alquiler
            for rental in rentals:
                # Formatear la fecha para el diccionario (YYYY-MM-DD)
                fecha_str = rental.created_at.strftime('%Y-%m-%d')
                
                # Sumar el monto al día correspondiente
                if fecha_str in daily_amounts:
                    daily_amounts[fecha_str] += rental.total

                # Sumar al total general
                total_deposited += rental.total
                
                # Agregar a los detalles
                deposits_details.append({
                    'rental_id': rental.id,
                    'tenant_username': rental.tenant_username,
                    'amount': rental.total,
                    'fecha': fecha_str,
                    'propiedad': f"{rental.property_address} {rental.property_address_number}, {rental.property_city}"
                })
            
            # Ordenar fechas para el gráfico
            fechas = list(daily_amounts.keys())
            fechas.sort()  # Asegurar que estén en orden cronológico

            return jsonify({
                'total_depositado': total_deposited,
                'conteo_diario': daily_amounts,  # Montos por día para el gráfico
                'fechas': fechas,                # Lista ordenada de fechas
                'deposits': deposits_details     # Detalles de cada depósito
            }), 200
    except Exception as e:
        return jsonify({'error': {str(e)}}), 500

@app.route('/statistics/rentals', methods=['GET'])
def get_rental_statistics():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Debe proporcionar las fechas de inicio y fin.'}), 400

    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        end_date_with_time = datetime.combine(end_date_obj, datetime.max.time())
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400

    try:
        with Session() as session:
            # Consultar alquileres en el rango de fechas
            rentals = session.query(Rental).filter(
                Rental.created_at.between(start_date_obj, end_date_with_time)
            ).all()

            # Diccionario para almacenar conteos por día
            daily_counts = {}
            
            # Inicializar contador por día (con 0 para cada día en el rango)
            date_range = (end_date_obj - start_date_obj).days + 1

            for i in range(date_range):
                current_date = (start_date_obj + timedelta(days=i)).strftime('%Y-%m-%d')
                daily_counts[current_date] = 0
            
            # Detalles de los alquileres para la respuesta
            rental_details = []
            total_rentals = 0

            # Procesar cada alquiler
            for rental in rentals:
                # Formatear la fecha para el diccionario (YYYY-MM-DD)
                fecha_str = rental.created_at.strftime('%Y-%m-%d')
                
                # Sumar al conteo del día correspondiente
                if fecha_str in daily_counts:
                    daily_counts[fecha_str] += 1

                # Sumar al total general
                total_rentals += 1
                
                # Agregar a los detalles
                rental_details.append({
                    'rental_id': rental.id,
                    'tenant_username': rental.tenant_username,
                    'property_address': f"{rental.property_address} {rental.property_address_number}, {rental.property_city}",
                    'created_at': fecha_str,
                    'status': rental.status
                })
            
            # Ordenar fechas para el gráfico
            fechas = list(daily_counts.keys())
            fechas.sort()  # Asegurar que estén en orden cronológico
            return jsonify({
                'total_alquileres': total_rentals,
                'conteo_diario': daily_counts,  # Conteos por día para el gráfico
                'fechas': fechas,                # Lista ordenada de fechas
                'rentals': rental_details        # Detalles de cada alquiler
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500