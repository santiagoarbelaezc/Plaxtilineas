import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

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
    path: 'productos',
    loadComponent: () => import('./pages/productos/productos').then(m => m.Productos)
  },
  {
    path: 'contacto',
    loadComponent: () => import('./pages/contacto/contacto').then(m => m.Contacto)
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
      }
    ]
  }
];
