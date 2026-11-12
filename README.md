<div align="center">
  <img src="https://res.cloudinary.com/dsv1gdgya/image/upload/v1766281904/Logo_fovu78c_djnblz.png" alt="Plaxtilineas" width="220" />
  <h1>Plaxtilineas — Plataforma E-commerce & Panel Administrativo</h1>
  <p><strong>Soluciones integrales en plásticos técnicos, espumas industriales, mallas agrícolas y empaques en el Eje Cafetero y Colombia.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 20" />
    <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 12" />
    <img src="https://img.shields.io/badge/PHP-8.5-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP 8.5" />
    <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL 8" />
    <img src="https://img.shields.io/badge/Wompi-Bancolombia-000000?style=for-the-badge&logo=visa&logoColor=white" alt="Wompi" />
    <img src="https://img.shields.io/badge/Pest-3.0_Tests_Passing-brightgreen?style=for-the-badge" alt="Pest Tests" />
  </p>
</div>

---

## 📋 Descripción del Proyecto

**Plaxtilineas** es una solución web de comercio electrónico y gestión empresarial de última generación, desarrollada bajo una arquitectura desacoplada de alto rendimiento:

* **Backend REST API**: Desarrollado en **Laravel 12 (PHP 8.5)** con autenticación segura por tokens mediante **Laravel Sanctum**, pasarela de pagos integrada **Wompi**, almacenamiento en **Cloudinary**, envío de correos transaccionales y un sistema integral de **Auditoría y Trazabilidad**.
* **Frontend SPA**: Desarrollado en **Angular 20** (Standalone Components, Signals, Router reactivo), con diseño responsive optimizado para dispositivos móviles y escritorio, micro-animaciones interactivas y un **Dashboard Administrativo** completo con estilo Bento Grid.

---

## 🚀 Módulos y Funcionalidades Principales

### 🛒 Tienda Online & Catálogo
* Catálogo dinámico con filtros por categorías (Peletería & Espumas, Plásticos Técnicos, Mallas & Polisombras, Soluciones de Embalaje).
* Detalle de producto con cálculo dinámico de medidas y variantes de inventario.
* Carrito de compras reactivo con sincronización local y de servidor.
* Pasarela de pagos **Wompi** con soporte para PSE, Tarjetas de Crédito, Nequi y Bancolombia, además de reconciliación proactiva de transacciones.
* Canal de radicación y consulta de **PQRS** en tiempo real con generación de tickets (`PQR-XXXXXX-XXX`).
* Hub central de canales y redes oficiales (`/links`).

### 🛡️ Panel de Administración (`/admin`)
* **Inventario & Catálogo**: Sincronización oficial de productos, stock en tiempo real y precios.
* **Gestión de Pedidos**: Control de órdenes, actualización de guías y transportadoras con notificación por correo al cliente.
* **Directorio de Clientes**: Monitoreo de usuarios registrados, carritos activos e historial de compras.
* **PQRS Administrativo**: Atención, cambio de estados y respuestas con adjuntos y notificación por correo.
* **Personalización Web**: Editor visual de componentes dinámicos de la página de inicio.
* **Asistente Inteligente Mateo**: Módulo asistencial para consultas operativas rápidas.
* **Auditoría & Trazabilidad**:
  - Cronómetro en vivo de sesión activa de administrador.
  - Registro inmutable de cada operación con fecha, hora exacta (`HH:mm:ss`), IP y snapshots de datos anteriores vs. datos nuevos.
  - Trazabilidad de eliminación de usuarios, gestión de pedidos, respuestas a PQRS y cambios de configuración.
  - Historial de conexiones de administradores con tiempo total permanecido logueado.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Frontend** | Angular | 20.3 (Standalone, Signals, Reactive) |
| **Estilos & UI** | TailwindCSS + CSS Modules | Diseño Dark & Minimal Bento System |
| **Iconos** | FontAwesome + Material Symbols | SVG Core 6.7 |
| **Backend** | Laravel Framework | 12.70.1 |
| **Lenguaje Backend** | PHP | 8.5.1 |
| **Autenticación** | Laravel Sanctum | Tokens personales Bearer |
| **Base de Datos** | MySQL | Producción Hostinger (SQLite en memoria para testing) |
| **Testing** | Pest / PHPUnit | Pest 3.0 / PHPUnit 11.5 (Suite automatizada) |
| **Pasarela** | Wompi Bancolombia | Webhook + Checksum + Polling proactivo |
| **Multimedia** | Cloudinary API | Almacenamiento y optimización de medios |

---

## 📂 Estructura del Repositorio

```
Plaxtilineas/
├── backend-laravel/          # Servidor de API REST en Laravel 12
│   ├── app/
│   │   ├── Actions/          # Lógica de dominio encapsulada (Pedidos, Pagos, Carrito)
│   │   ├── Http/Controllers/ # Controladores REST API
│   │   ├── Http/Middleware/  # Middlewares de seguridad y auditoría
│   │   ├── Models/           # Modelos Eloquent
│   │   └── Services/         # Servicios (Auditoría, Captcha, Catálogo, Wompi)
│   ├── database/migrations/  # Migraciones de base de datos
│   ├── routes/api.php        # Endpoints de la API
│   └── tests/                # Pruebas automatizadas (Pest)
├── frontend/                 # Aplicación cliente en Angular 20
│   ├── src/app/
│   │   ├── pages/            # Páginas principales y del Dashboard
│   │   ├── services/         # Servicios HTTP
│   │   └── shared/           # Componentes y layouts compartidos
├── documentacion/            # Documentación técnica detallada
│   ├── auditoria_y_trazabilidad.md
│   ├── arquitectura_general.md
│   └── manual_administrador.md
└── README.md
```

---

## ⚙️ Instalación y Ejecución Local

### Prerrequisitos
* PHP >= 8.2 (Recomendado PHP 8.5)
* Composer >= 2.6
* Node.js >= 18 y npm / pnpm
* MySQL o SQLite

### 1. Backend (Laravel)
```bash
cd backend-laravel

# Instalar dependencias
composer install

# Configurar variables de entorno
cp .env.example .env
php artisan key:generate

# Ejecutar migraciones
php artisan migrate

# Iniciar servidor local
php artisan serve
```
El servidor backend se ejecutará en `http://localhost:8000`.

### 2. Frontend (Angular)
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```
La aplicación web estará disponible en `http://localhost:4200`.

---

## 🧪 Pruebas Automatizadas

Para ejecutar las pruebas del backend con Pest:

```bash
cd backend-laravel
php artisan test
```

Para ejecutar pruebas de auditoría y sesiones en particular:
```bash
php vendor/pestphp/pest/bin/pest tests/Feature/Admin/AdminAuditoriaTest.php
```

---

## 📖 Documentación Detallada

En la carpeta [`documentacion/`](./documentacion/) encontrarás guías exhaustivas:
* [`auditoria_y_trazabilidad.md`](./documentacion/auditoria_y_trazabilidad.md): Arquitectura de sesiones, modelos y logs de auditoría.
* [`arquitectura_general.md`](./documentacion/arquitectura_general.md): Arquitectura técnica, RBAC y flujos de integración.
* [`manual_administrador.md`](./documentacion/manual_administrador.md): Manual de uso del panel administrativo para auditoría y trazabilidad.

---

## 📄 Licencia y Derechos

© 2026 **Plaxtilineas S.A.S.** — Armenia, Quindío, Colombia. Todos los derechos reservados.
