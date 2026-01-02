import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriaIndex } from '../../models/categoriaIndex.model';
import { CategoriasService } from '../../services/categorias.service';
import { CategoriaMenuService } from '../../services/categoria-menu.service';
import { MenuStateService } from '../../services/menu-state.service';

@Component({
  selector: 'app-categorias-destacadas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categorias-destacadas.component.html',
  styleUrls: ['./categorias-destacadas.component.css']
})
export class CategoriasDestacadasComponent implements OnInit {
  categorias: CategoriaIndex[] = [];
  categoriasConSubcategorias: any[] = [];

  // 🔹 Categorías con imágenes fijas
  categoriasFijas = [
    { nombre: 'pisos', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218660/cate4_vqgwa9.png' },
    { nombre: 'espumas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate2_zsdzyl.png' },
    { nombre: 'vinipel', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218670/cate7_etqoez.png' },
    { nombre: 'mimbres', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate1_ub8akd.png' },
    { nombre: 'sogas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1766975481/feature1-plaxti_j04h8a.png' },
    { nombre: 'pegantes', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218659/cate5_vr4sct.png' },
    { nombre: 'mallas', icono_url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1767218660/cate6_suvlyh.png' }
  ];

  constructor(
    private categoriasService: CategoriasService,
    private categoriaMenuService: CategoriaMenuService,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    // Opción 1: Usar categorías del servicio
    this.categoriasService.getCategorias().subscribe({
      next: data => {
        // 🔹 Combinar datos del servicio con imágenes fijas
        this.categorias = data.map(cat => {
          const categoriaFija = this.categoriasFijas.find(f => 
            f.nombre.toLowerCase() === cat.nombre.toLowerCase()
          );
          
          return {
            ...cat,
            icono_url: categoriaFija?.icono_url || cat.icono_url
          };
        });
        
        console.log(`✅ Categorías cargadas: ${data.length}`);
        
        // Cargar las categorías con subcategorías
        this.cargarCategoriasConSubcategorias();
      },
      error: err => {
        console.error('❌ Error al cargar categorías:', err);
        // 🔹 Opción 2: Usar categorías fijas si falla el servicio
        this.cargarCategoriasFijas();
      }
    });
  }

  /**
   * Carga las categorías con sus subcategorías
   */
  private cargarCategoriasConSubcategorias(): void {
    this.categoriaMenuService.obtenerCategorias().subscribe({
      next: (categoriasCompletas) => {
        this.categoriasConSubcategorias = categoriasCompletas;
        console.log('📂 Categorías con subcategorías cargadas:', categoriasCompletas);
      },
      error: (err) => {
        console.error('❌ Error al cargar categorías con subcategorías:', err);
        this.categoriasConSubcategorias = [];
      }
    });
  }

  /**
   * Cargar categorías fijas como fallback
   */
  private cargarCategoriasFijas(): void {
    this.categorias = this.categoriasFijas.map((cat, index) => ({
      id: index + 1,
      nombre: cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1),
      icono_url: cat.icono_url,
      descripcion: `Productos de ${cat.nombre}`,
      destacado: true,
      orden: index + 1
    }));
    
    console.log('📋 Usando categorías fijas:', this.categorias);
  }

  /**
   * Obtener la primera subcategoría de una categoría
   */
  obtenerPrimeraSubcategoria(categoriaId: number): number | null {
    if (this.categoriasConSubcategorias.length === 0) {
      console.warn('⚠️ No se han cargado las subcategorías aún');
      return null;
    }

    const categoriaCompleta = this.categoriasConSubcategorias.find(
      cat => cat.id === categoriaId
    );

    if (!categoriaCompleta || !categoriaCompleta.subcategorias || categoriaCompleta.subcategorias.length === 0) {
      console.warn(`⚠️ La categoría ${categoriaId} no tiene subcategorías`);
      return null;
    }

    const primeraSubcategoriaId = categoriaCompleta.subcategorias[0].id;
    console.log(`📌 Categoría ${categoriaId}: primera subcategoría ID = ${primeraSubcategoriaId}`);
    
    return primeraSubcategoriaId;
  }

  /**
   * Manejar clic en una categoría
   */
  onCategoriaClick(categoria: CategoriaIndex): void {
    console.log(`🖱️ Categoría clickeada: ${categoria.nombre} (ID: ${categoria.id})`);
    
    const subcategoriaId = this.obtenerPrimeraSubcategoria(categoria.id);
    
    if (subcategoriaId) {
      this.menuStateService.saveLastSelectedSubcategory(subcategoriaId);
      console.log(`✅ Subcategoría ${subcategoriaId} guardada en estado`);
    } else {
      console.warn(`⚠️ No se pudo obtener subcategoría para categoría ${categoria.id}`);
    }
  }

  /**
   * Manejar errores en las imágenes
   */
  handleImageError(event: Event, categoria: CategoriaIndex): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn(`⚠️ Error cargando imagen para ${categoria.nombre}`);
    
    // Buscar imagen alternativa en las categorías fijas
    const categoriaFija = this.categoriasFijas.find(
      f => f.nombre.toLowerCase() === categoria.nombre.toLowerCase()
    );
    
    if (categoriaFija) {
      imgElement.src = categoriaFija.icono_url;
    } else {
      imgElement.src = 'assets/images/default-category.png';
    }
  }
}