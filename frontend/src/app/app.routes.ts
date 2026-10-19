// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio)
  },
  {
    path: 'nosotros',
    loadComponent: () => import('./pages/nosotros/nosotros').then(m => m.Nosotros)
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./pages/privacidad/privacidad').then(m => m.Privacidad)
  },
  {
    path: 'pqrs-crear',
    loadComponent: () => import('./pages/pqr/pqr').then(m => m.Pqr)
  },
  {
    path: 'terminos',
    loadComponent: () => import('./pages/terminos-condiciones/terminos').then(m => m.Terminos)
  },
  {
    path: 'cookies',
    loadComponent: () => import('./pages/cookies/cookies').then(m => m.Cookies)
  },
  {
    path: 'aviso-legal',
    loadComponent: () => import('./pages/aviso-legal/aviso-legal').then(m => m.AvisoLegal)
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos/productos').then(m => m.Productos)
  },
  {
    path: 'producto/:id',
    loadComponent: () => import('./features/products/description-producto/description-producto').then(m => m.DescriptionProducto)
  },
  {
    path: 'contacto',
    loadComponent: () => import('./pages/contacto/contacto').then(m => m.Contacto)
  },
  {
    path: 'busqueda',
    loadComponent: () => import('./pages/buscar/buscar').then(m => m.Buscar)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/dashboard/dashboard/dashboard').then(m => m.Dashboard),
    children: [
      {
        path: 'pedidos',
        loadComponent: () => import('./pages/dashboard/pedidos/admin-pedidos').then(m => m.AdminPedidos)
      },
      {
        path: 'personalizar-web',
        loadComponent: () => import('./pages/dashboard/personalizar-web/personalizar-web').then(m => m.PersonalizarWeb)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/dashboard/pedidos/admin-usuarios').then(m => m.AdminUsuarios)
      },
      {
        path: 'pqr-admin',
        loadComponent: () => import('./pages/dashboard/pqr/pqr').then(m => m.Pqr)
      },
      {
        path: 'inventario',
        loadComponent: () => import('./pages/dashboard/catalogo/admin-catalogo').then(m => m.AdminCatalogo)
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/dashboard/categorias/admin-categorias').then(m => m.AdminCategorias)
      },
      { path: 'catalogo', redirectTo: 'inventario' },
      { path: 'subcategorias', redirectTo: 'categorias' },
      { path: 'productos', redirectTo: 'inventario' },
      { path: 'analiticas', redirectTo: '' },
      { path: 'estadisticas', redirectTo: '' },
      { path: 'reportes', redirectTo: '' }
    ]
  },
  {
    path: 'carrito',
    loadComponent: () => import('./cart/cart-summary/cart-summary.component').then(m => m.CartSummaryComponent)
  },
  {
    path: 'pedidos',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/mis-pedidos/mis-pedidos').then(m => m.MisPedidos)
  },
  {
    path: 'perfil',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent)
  },
  {
    path: 'configuracion',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
  },
  {
    path: 'pago',
    loadComponent: () => import('./pages/pago/pago.component').then(m => m.PagoComponent)
  },
  {
    path: 'pago-exitoso',
    loadComponent: () => import('./pages/pago-exitoso/pago-exitoso.component').then(m => m.PagoExitosoComponent)
  },
  {
    path: 'pago-desarrollo',
    loadComponent: () => import('./pages/pago-desarrollo/pago-desarrollo.component').then(m => m.PagoDesarrolloComponent)
  },
  {
    path: 'pago-asistido',
    loadComponent: () => import('./pages/pago-asistido/pago-asistido.component').then(m => m.PagoAsistidoComponent)
  },

  {
    path: 'verificar-email',
    loadComponent: () => import('./pages/verificar-email/verificar-email').then(m => m.VerificarEmail)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

// Configuración del router con scroll al top
export const routerConfig = {
  scrollPositionRestoration: 'top' as const, // ⭐ Esto hace que siempre empiece desde el top
  anchorScrolling: 'enabled' as const
};

// Exportar el proveedor del router configurado
export const provideAppRouter = () => provideRouter(routes, withInMemoryScrolling(routerConfig));