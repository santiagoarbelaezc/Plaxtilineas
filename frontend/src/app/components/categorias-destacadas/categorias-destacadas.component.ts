import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriaIndex } from '../../models/categoriaIndex.model';
import { CategoriasService } from '../../services/categorias.service';

@Component({
  selector: 'app-categorias-destacadas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categorias-destacadas.component.html',
  styleUrls: ['./categorias-destacadas.component.css']
})
export class CategoriasDestacadasComponent implements OnInit, AfterViewInit {
  categorias: CategoriaIndex[] = [];
  public carouselId = 'categorias-carousel';
  
  // Variables para el carrusel
  currentIndex = 0;
  visibleItems = 3;
  itemsPerGroup = 3;

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit(): void {
    this.categoriasService.getCategorias().subscribe({
      next: data => {
        this.categorias = data;
        console.log(`✅ Categorías cargadas: ${data.length}`);
        
        // Calcular items visibles según el ancho de pantalla
        this.calculateVisibleItems();
        
        // Calcular grupos para los indicadores
        this.calculateItemsPerGroup();
      },
      error: err => console.error('❌ Error al cargar categorías destacadas:', err)
    });
  }

  ngAfterViewInit(): void {
    // Inicializar el carrusel después de que la vista esté lista
    setTimeout(() => {
      this.initCarousel();
    }, 500);
  }

  private calculateVisibleItems(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.visibleItems = 1;      // Mobile
    } else if (width < 1024) {
      this.visibleItems = 2;      // Tablet
    } else {
      this.visibleItems = 3;      // Desktop
    }
  }

  private calculateItemsPerGroup(): void {
    this.itemsPerGroup = Math.min(this.visibleItems, 3);
  }

  private initCarousel(): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.categorias.length === 0) return;

    // Asegurar que el scroll esté en la posición inicial
    carousel.scrollLeft = 0;
    
    // Configurar scroll suave
    carousel.style.scrollBehavior = 'smooth';
    
    console.log('🎠 Carrusel de categorías inicializado');
  }

  scrollCarousel(direction: 'prev' | 'next'): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel || this.categorias.length === 0) {
      console.warn('⚠️ No se encontró el elemento del carrusel de categorías');
      return;
    }

    const itemWidth = this.getItemWidth();
    const scrollAmount = itemWidth * this.visibleItems;
    const currentScroll = carousel.scrollLeft;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    let newScroll: number;
    let newIndex: number;

    if (direction === 'next') {
      newScroll = Math.min(currentScroll + scrollAmount, maxScroll);
      newIndex = Math.min(
        this.currentIndex + this.visibleItems,
        this.categorias.length - this.visibleItems
      );
    } else {
      newScroll = Math.max(currentScroll - scrollAmount, 0);
      newIndex = Math.max(this.currentIndex - this.visibleItems, 0);
    }

    // Aplicar scroll
    carousel.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });

    // Actualizar índice actual
    this.currentIndex = newIndex;

    console.log(`🔄 Carrusel desplazado a: ${direction}, posición: ${newScroll}, índice: ${this.currentIndex}`);
  }

  private getItemWidth(): number {
    // Obtener el ancho aproximado de un item
    // Por defecto usamos 300px + márgenes
    return 320;
  }

  scrollToIndex(index: number): void {
    const carousel = document.getElementById(this.carouselId);
    if (!carousel) return;

    const itemWidth = this.getItemWidth();
    const scrollPosition = index * itemWidth;

    carousel.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });

    this.currentIndex = index;
    console.log(`🎯 Carrusel desplazado al índice: ${index}`);
  }

  // Obtener los grupos para los indicadores
  getIndicatorGroups(): number[][] {
    const groups: number[][] = [];
    
    if (this.categorias.length === 0) return groups;

    for (let i = 0; i < this.categorias.length; i += this.itemsPerGroup) {
      const group = this.categorias.slice(i, i + this.itemsPerGroup);
      groups.push(group.map((_, index) => i + index));
    }
    
    return groups;
  }

  // Método para manejar errores en las imágenes
  handleImageError(event: Event, categoria: CategoriaIndex): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn(`⚠️ Error cargando imagen para ${categoria.nombre}`);
    imgElement.src = 'assets/images/default-category.png';
  }

  // Obtener clase CSS según el índice (para efectos visuales)
  getCategoriaClass(index: number): string {
    const classes = ['categoria-primary', 'categoria-secondary', 'categoria-accent'];
    return classes[index % classes.length];
  }

  // Verificar si el botón de navegación está habilitado
  isPrevEnabled(): boolean {
    return this.currentIndex > 0;
  }

  isNextEnabled(): boolean {
    return this.currentIndex < this.categorias.length - this.visibleItems;
  }

  // Método para obtener el número de grupo actual
  getCurrentGroupIndex(): number {
    return Math.floor(this.currentIndex / this.itemsPerGroup);
  }
}