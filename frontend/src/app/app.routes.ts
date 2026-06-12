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
    loadComponent: () => import('./components/description-producto/description-producto').then(m => m.DescriptionProducto)
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
        path: 'categorias',
        loadComponent: () => import('./pages/dashboard/categorias/categorias').then(m => m.Categorias)
      },
      {
        path: 'subcategorias',
        loadComponent: () => import('./pages/dashboard/sub-categorias/sub-categorias').then(m => m.SubCategorias)
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/dashboard/productos/productos').then(m => m.Productos)
      },
      {
        path: 'inventario',
        loadComponent: () => import('./pages/dashboard/inventario/inventario').then(m => m.Inventario)
      },
      {
        path: 'pqr-admin',
        loadComponent: () => import('./pages/dashboard/pqr/pqr').then(m => m.Pqr)
      },
      {
        path: 'analiticas',
        loadComponent: () => import('./pages/dashboard/analiticas/analiticas').then(m => m.Analiticas)
      },
      {
        path: 'personalizar-web',
        loadComponent: () => import('./pages/dashboard/personalizar-web/personalizar-web').then(m => m.PersonalizarWeb)
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./pages/dashboard/estadisticas/estadisticas').then(m => m.Estadisticas)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./pages/dashboard/reportes/reportes').then(m => m.Reportes)
      }
    ]
  },
  {
    path: 'carrito',
    loadComponent: () => import('./cart/cart-summary/cart-summary.component').then(m => m.CartSummaryComponent)
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