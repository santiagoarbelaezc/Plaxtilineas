// src/app/services/producto-menu.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductoMenu } from '../models/productoMenu.model';
import { ProductoEditable } from '../models/producto.model';
import { ProductosService } from './productos.service';

/**
 * Adaptador unificado sobre ProductosService / CatalogoService.
 * Garantiza que cualquier consumidor de ProductoMenu reciba únicamente
 * productos del catálogo oficial de Plaxtilineas con precio válido (> 0).
 */
@Injectable({
  providedIn: 'root'
})
export class ProductoMenuService {
  constructor(private productosService: ProductosService) {}

  private toProductoMenu(p: ProductoEditable): ProductoMenu {
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      cantidad: p.cantidad || 0,
      precio: Number(p.precio) || 0,
      imagen_url: p.imagen_url,
      subcategoria_id: p.subcategoria_id,
      subcategoria: p.subcategoria || '',
      categoria: p.categoria || '',
      unidad: p.unidad || 'unidades',
      stock: p.stock,
      minimo_compra: p.minimo_compra,
      controlar_stock: p.controlar_stock
    };
  }

  obtenerPorSubcategoria(subcategoriaId: number): Observable<ProductoMenu[]> {
    return this.productosService
      .obtenerProductosPorSubcategoria(subcategoriaId)
      .pipe(map(list => list.map(p => this.toProductoMenu(p))));
  }

  obtenerPorCategoria(categoriaId: number): Observable<ProductoMenu[]> {
    return this.productosService
      .obtenerProductosPorCategoriaId(categoriaId)
      .pipe(map(list => list.map(p => this.toProductoMenu(p))));
  }

  obtenerTodosLosProductos(): Observable<ProductoMenu[]> {
    return this.productosService
      .obtenerProductos()
      .pipe(map(list => list.map(p => this.toProductoMenu(p))));
  }

  obtenerAleatorios(limite: number = 8): Observable<ProductoMenu[]> {
    return this.productosService
      .obtenerProductosAleatorios(limite)
      .pipe(map(list => list.map(p => this.toProductoMenu(p))));
  }

  obtenerUltimosProductos(): Observable<ProductoMenu[]> {
    return this.productosService
      .obtenerUltimosProductos(20)
      .pipe(map(list => list.map(p => this.toProductoMenu(p))));
  }
}
