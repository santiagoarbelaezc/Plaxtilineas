<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=header&animation=fadeIn" />
</div>

[![Angular](https://img.shields.io/badge/Angular-18.2.0-red.svg)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<h1 align="center">🛍️ Plaxtilíneas – Plataforma E-commerce</h1>

<h3 align="center">📍 Plataforma digital para empresa en Armenia, Quindío</h3>

<p align="center">Sistema web para gestión y visualización de productos con catálogo moderno y administrable.</p>

---

## 📌 Descripción
Plataforma e-commerce desarrollada para empresa en **Armenia, Quindío**. Enfocada en **gestión de catálogo y visualización de productos**. Arquitectura desacoplada frontend/backend con API REST.

---

## 🚀 **Arquitectura de Despliegue**
### **🌐 Frontend (Hostinger)**
- Aplicación Angular desplegada en **Hostinger**
- Optimizado para rendimiento y accesibilidad global
- Configuración de dominio y SSL incluida

### **⚙️ Backend (AWS Cloud)**
- API REST desplegada en **AWS Elastic Beanstalk**
- Escalado automático y balanceo de carga
- Distribución global mediante **Amazon CloudFront**
- Alta disponibilidad y bajo latencia

### **🗄️ Base de Datos (Hostinger)**
- MySQL alojado en **Hostinger**
- Gestión centralizada y backups automáticos
- Conexión segura entre servicios

---

## 🧩 Funcionalidades
### 🔧 **Backend (Administración)**
- Gestión de categorías y subcategorías
- Gestión de productos y variantes
- API REST completa

### 🖥️ **Frontend (Cliente)**
- Catálogo de productos navegable
- Diseño responsive y moderno
- Experiencia de usuario optimizada

---

## 🔧 **Tech Stack**

### **Frontend**
<div align="center">
  <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/Hostinger-673DE6?style=for-the-badge&logo=hostinger&logoColor=white" />
</div>

### **Backend**
<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/Elastic_Beanstalk-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/CloudFront-FF4F8B?style=for-the-badge&logo=amazoncloudfront&logoColor=white" />
</div>

### **Base de Datos**
<div align="center">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/Hostinger-673DE6?style=for-the-badge&logo=hostinger&logoColor=white" />
</div>

### **Infraestructura**
<div align="center">
  <img src="https://img.shields.io/badge/Hostinger-673DE6?style=for-the-badge&logo=hostinger&logoColor=white" />
  <img width="8" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white" />
</div>

---

## 🏗 Arquitectura del Sistema

El proyecto implementa una **arquitectura distribuida moderna**, desacoplando frontend, backend y base de datos en diferentes proveedores de infraestructura:

### **🖥️ Frontend (Capa de Presentación)**
| Componente | Descripción | Tecnologías | Despliegue |
|------------|-------------|-------------|------------|
| **Aplicación Angular** | Single Page Application principal | Angular 16+, TypeScript, HTML5, CSS3 | Hostinger |
| **Interfaz de Usuario** | Catálogo de productos responsive | Componentes Angular, RxJS | Hostinger |
| **Gestión de Estado** | Estado global de la aplicación | Services, RxJS BehaviorSubject | Hostinger |

### **🌐 CDN & Routing (Capa de Red)**
| Componente | Descripción | Tecnologías | Proveedor |
|------------|-------------|-------------|-----------|
| **Amazon CloudFront** | Content Delivery Network global | CDN, SSL/TLS, Caching | AWS |
| **Routing de Peticiones** | Direccionamiento API y assets | Request Routing, Edge Locations | AWS |
| **Terminación SSL** | Seguridad en tránsito | TLS 1.2+, HTTPS | AWS |

### **⚙️ Backend (Capa de Servicios)**
| Componente | Descripción | Tecnologías | Despliegue |
|------------|-------------|-------------|------------|
| **API REST** | Servicios backend principales | Node.js, Express.js | AWS Elastic Beanstalk |
| **Gestión de Productos** | CRUD de productos y categorías | Express Routes, Controllers | AWS Elastic Beanstalk |
| **Auto-scaling** | Escalado automático por demanda | Load Balancer, Auto-scaling Groups | AWS |

### **🗄️ Base de Datos (Capa de Persistencia)**
| Componente | Descripción | Tecnologías | Proveedor |
|------------|-------------|-------------|-----------|
| **MySQL Database** | Almacenamiento persistente | MySQL 8.0+, Relacional | Hostinger |
| **Gestión de Datos** | Productos, categorías, usuarios | Tablas relacionales, índices | Hostinger |
| **Conexiones Seguras** | Comunicación encriptada | SSL Database Connections | Hostinger |

---

## 🔄 Flujo de Comunicación

Usuario → Frontend Angular (Hostinger)
→ CloudFront CDN (AWS)
→ API REST (Elastic Beanstalk - AWS)
→ MySQL Database (Hostinger)


## 📊 Características por Capa

### **Frontend (Hostinger)**
- **Hosting**: Alojamiento web optimizado para Angular
- **Rendimiento**: Carga rápida de assets estáticos
- **Disponibilidad**: 99.9% uptime garantizado

### **CDN (AWS CloudFront)**
- **Distribución**: 300+ edge locations globales
- **Caché**: Caching inteligente de recursos
- **Seguridad**: Protección DDoS y WAF

### **Backend (AWS Elastic Beanstalk)**
- **Escalabilidad**: Auto-scaling basado en carga
- **Balanceo**: Load balancer distribuido
- **Monitoreo**: CloudWatch integrado

### **Base de Datos (Hostinger MySQL)**
- **Almacenamiento**: 20GB SSD inicial
- **Backups**: Copias de seguridad diarias
- **Conectividad**: Conexiones simultáneas ilimitadas

---

### Principios de Diseño Aplicados

1. **Separación de Responsabilidades**: Cada capa tiene responsabilidades específicas y bien definidas
2. **Escalabilidad Independiente**: Cada componente escala según su propia demanda
3. **Seguridad en Capas**: Múltiples niveles de protección (SSL, firewalls, autenticación)
4. **Alta Disponibilidad**: Redundancia y distribución geográfica
5. **Mantenibilidad**: Despliegue y actualización independiente por componente

---

👨‍💻 **Autor**
<div align="center">
Santiago Arbelaez Contreras

Junior Full Stack Developer

Estudiante Ingeniería de Sistemas – Universidad del Quindío

<br> <a href="https://www.linkedin.com/in/santiago-arbelaez-contreras-9830b5290/"> <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" /> </a> <img width="10" /> <a href="https://portfolio-santiagoa.web.app/portfolio"> <img src="https://img.shields.io/badge/✨_Portfolio-6C63FF?style=for-the-badge&logo=sparkles&logoColor=white" /> </a> <img width="10" /> <a href="mailto:arbelaezz.c11@gmail.com"> <img src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" /> </a>
</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=90&section=footer&animation=fadeIn" />
</div>
