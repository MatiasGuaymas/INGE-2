from sqlalchemy import ForeignKeyConstraint, create_engine, ForeignKey, Column, Integer, String, Date, Enum, PrimaryKeyConstraint, Float, Boolean, DateTime
from datetime import datetime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    username = Column(String(50), nullable=False, primary_key=True)  
    password = Column(String(50), nullable=False)
    email = Column("email", String(50), nullable=False)
    created_at = Column(Date, nullable=False, default=datetime.now)

    def __init__(self, username, password, email):
        self.username = username
        self.password = password
        self.email = email
        self.created_at = datetime.now() 

    def __repr__(self):
        return f"User(username={self.username}, password={self.password}, email={self.email}, created_at={self.created_at})"


class Tenant(User):
    __tablename__ = 'tenants'
    username = Column(String(50), ForeignKey('users.username'), primary_key=True)
    last_name = Column(String(100), nullable=False)   
    first_name = Column(String(100), nullable=False)    
    dni = Column(String(20), nullable=False)
    birth_date = Column(Date, nullable=False)              
    phone = Column(String(20), nullable=False)          

    def __init__(self, username, password, email, last_name, first_name, dni, birth_date, phone):
        super().__init__(username, password, email)
        self.last_name = last_name
        self.first_name = first_name
        self.dni = dni
        self.birth_date = birth_date
        self.phone = phone

    def __repr__(self):
        return (f"Tenant(username={self.username}, last_name={self.last_name}, first_name={self.first_name}, "
                f"dni={self.dni}, birth_date={self.birth_date}, phone={self.phone}, "
                f"password={self.password}, email={self.email})")

class Employee(User):
    __tablename__ = 'employees'
    username = Column(String(50), ForeignKey('users.username'), primary_key=True)

    __mapper_args__ = {
        'polymorphic_identity': 'employee',
        'concrete': False
    }


    def __init__(self, username, password, email):
        super().__init__(username, password, email)

    def __repr__(self):
        return f"Employee(username={self.username}, password={self.password}, email={self.email})"
    

class Manager(Employee):
    __tablename__ = 'managers'
    username = Column(String(50), ForeignKey('employees.username'), primary_key=True)

    def __init__(self, username, password, email):
        super().__init__(username, password, email)

    def __repr__(self):
        return f"Manager(username={self.username}, password={self.password}, email={self.email})"

    __mapper_args__ = {
        'polymorphic_identity': 'manager',
    }

class Property(Base):
    __tablename__ = 'properties'
    address = Column(String(50), nullable=False)
    address_number = Column(Integer, nullable=False)
    property_name = Column(String(100), nullable=False)
    price_per_night = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False)
    floor = Column(Integer, nullable=False)
    department = Column(String(10), nullable=False)
    city = Column(String(50), nullable=False)
    province = Column(String(50), nullable=False)
    politica_de_cancelacion = Column(Enum('flexible', 'moderate', 'strict', name='politica_de_cancelacion'), nullable=False, default='flexible')
    is_active = Column(Boolean, default=True)
    on_maintenance = Column(Boolean, default=False)

    __table_args__ = (
        PrimaryKeyConstraint(
            'address', 'address_number', 'floor', 'department', 'city', 'province'
        ),
    )

    def __init__(self, address, address_number, property_name, price_per_night, capacity, floor, department, city, province, politica_de_cancelacion):
        self.address = address
        self.address_number = address_number
        self.property_name = property_name
        self.price_per_night = price_per_night
        self.capacity = capacity
        self.floor = floor
        self.department = department
        self.city = city
        self.province = province
        self.politica_de_cancelacion = politica_de_cancelacion  
        self.is_active = True
        self.on_maintenance = False

    def __repr__(self):
        return (f"Property(address={self.address}, address_number={self.address_number}, "
                f"property_name={self.property_name}, price_per_night={self.price_per_night}, "
                f"capacity={self.capacity}, floor={self.floor}, department={self.department}, "
                f"city={self.city}, province={self.province}, "
                f"politica_de_cancelacion={self.politica_de_cancelacion})")

class PropertyImage(Base):
    __tablename__ = 'property_images'
    id = Column(Integer, primary_key=True, autoincrement=True)
    property_address = Column(String(50), nullable=False)
    property_address_number = Column(Integer, nullable=False)
    property_floor = Column(Integer, nullable=False)
    property_department = Column(String(10), nullable=False)
    property_city = Column(String(50), nullable=False)
    property_province = Column(String(50), nullable=False)
    image_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    __table_args__ = (
        ForeignKeyConstraint(
            [
                'property_address',
                'property_address_number',
                'property_floor',
                'property_department',
                'property_city',
                'property_province'
            ],
            [
                'properties.address',
                'properties.address_number',
                'properties.floor',
                'properties.department',
                'properties.city',
                'properties.province'
            ]
        ),
    )
    property = relationship("Property", backref="images")
    def __init__(self, property_address, property_address_number, property_floor, property_department, property_city, property_province, image_path):
        self.property_address = property_address
        self.property_address_number = property_address_number
        self.property_floor = property_floor
        self.property_department = property_department
        self.property_city = property_city
        self.property_province = property_province
        self.image_path = image_path
    def __repr__(self):
        return f"PropertyImage(id={self.id}, property_address={self.property_address}, property_address_number={self.property_address_number}, property_floor={self.property_floor}, property_department={self.property_department}, property_city={self.property_city}, property_province={self.property_province}, image_path={self.image_path})"

class Rental(Base):
    __tablename__ = 'rentals'
    id = Column(Integer, primary_key=True, autoincrement=True)
    status = Column(String(20), nullable=False)  # Ej: 'activo', 'cancelado'
    fecha_entrega_llave = Column(Date, nullable=True)
    fecha_devolucion_llave = Column(Date, nullable=True)
    property_address = Column(String(50), nullable=False)
    property_address_number = Column(Integer, nullable=False)
    property_floor = Column(Integer, nullable=False)
    property_department = Column(String(10), nullable=False)
    property_city = Column(String(50), nullable=False)
    property_province = Column(String(50), nullable=False)
    cantidad_personas = Column(Integer, nullable=False)
    tenant_username = Column(String(50), ForeignKey('users.username'), nullable=False)
    fecha_tentativa_ingreso = Column(Date, nullable=False)
    fecha_tentativa_salida = Column(Date, nullable=False)
    total = Column(Float, nullable=False)
    motivo_devolucion_temprana = Column(String, nullable=True)
    created_at = Column(Date, nullable=False, default=datetime.now)

    __table_args__ = (
        ForeignKeyConstraint(
            ['property_address', 'property_address_number'],
            ['properties.address', 'properties.address_number']
        ),
    )

    # Relaciones (opcional)
    property = relationship("Property", backref="rentals")
    tenant = relationship("User", backref="rentals")

    def __repr__(self):
        return f"Rental(id={self.id}, status={self.status}, property={self.property_address} {self.property_address_number}, tenant={self.tenant_username}, total={self.total}, created_at={self.created_at})"

class PropertyQuestion(Base):
    __tablename__ = 'property_questions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    property_address = Column(String(50), nullable=False)
    property_address_number = Column(Integer, nullable=False)
    property_floor = Column(Integer, nullable=False)
    property_department = Column(String(10), nullable=False)
    property_city = Column(String(50), nullable=False)
    property_province = Column(String(50), nullable=False)
    tenant_username = Column(String(50), ForeignKey('tenants.username'), nullable=False)
    question_text = Column(String(255), nullable=False)
    created_at = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        ForeignKeyConstraint(
            [
                'property_address',
                'property_address_number',
                'property_floor',
                'property_department',
                'property_city',
                'property_province'
            ],
            [
                'properties.address',
                'properties.address_number',
                'properties.floor',
                'properties.department',
                'properties.city',
                'properties.province'
            ]
        ),
    )

    answers = relationship("PropertyAnswer", back_populates="question")
    property = relationship("Property", backref="questions")

    def __init__(self, property_address, property_address_number, property_floor, property_department, property_city, property_province, tenant_username, question_text, created_at):
        self.property_address = property_address
        self.property_address_number = property_address_number
        self.property_floor = property_floor
        self.property_department = property_department
        self.property_city = property_city
        self.property_province = property_province
        self.tenant_username = tenant_username
        self.question_text = question_text
        self.created_at = created_at

    def __repr__(self):
        return f"<PropertyQuestion(id={self.id}, tenant={self.tenant_username}, question='{self.question_text}')>"

class PropertyAnswer(Base):
    __tablename__ = 'property_answers'
    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey('property_questions.id'), nullable=False)
    answer_text = Column(String(255), nullable=False)
    employee_username = Column(String(50), ForeignKey('employees.username'), nullable=False)
    created_at = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    question = relationship("PropertyQuestion", back_populates="answers")

    def __init__(self, question_id, answer_text, employee_username, created_at):
        self.question_id = question_id
        self.answer_text = answer_text
        self.employee_username = employee_username
        self.created_at = created_at

    def __repr__(self):
        return f"<PropertyAnswer(id={self.id}, question_id={self.question_id}, employee={self.employee_username})>"

class PropertyRating(Base):
    __tablename__ = 'property_ratings'
    id = Column(Integer, primary_key=True, autoincrement=True)
    property_address = Column(String(50), nullable=False)
    property_address_number = Column(Integer, nullable=False)
    property_floor = Column(Integer, nullable=False)
    property_department = Column(String(10), nullable=False)
    property_city = Column(String(50), nullable=False)
    property_province = Column(String(50), nullable=False)
    tenant_username = Column(String(50), ForeignKey('tenants.username'), nullable=False)
    rating = Column(Float, nullable=False)  # 1 a 5
    comment = Column(String(255), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            [
                'property_address',
                'property_address_number',
                'property_floor',
                'property_department',
                'property_city',
                'property_province'
            ],
            [
                'properties.address',
                'properties.address_number',
                'properties.floor',
                'properties.department',
                'properties.city',
                'properties.province'
            ]
        ),
    )

    def __init__(self, property_address, property_address_number, property_floor, property_department, property_city, property_province, tenant_username, rating, comment=None):
        self.property_address = property_address
        self.property_address_number = property_address_number
        self.property_floor = property_floor
        self.property_department = property_department
        self.property_city = property_city
        self.property_province = property_province
        self.tenant_username = tenant_username
        self.rating = rating
        self.comment = comment

    def __repr__(self):
        return f"<PropertyRating(id={self.id}, property={self.property_address}, tenant={self.tenant_username}, rating={self.rating}, comment={self.comment})>"

engine = create_engine('sqlite:///mydb.db', echo=True)
# Base.metadata.drop_all(bind=engine)  # Drop all tables
Base.metadata.create_all(bind=engine)

Session = sessionmaker(bind=engine)
session = Session()