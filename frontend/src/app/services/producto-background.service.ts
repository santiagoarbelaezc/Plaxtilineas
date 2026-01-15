// src/app/services/producto-background.service.ts
import { Injectable } from '@angular/core';
import { ProductoBackgroundImage } from '../components/producto-background/producto-background';

/**
 * Configuración de ProductoBackground para una categoría
 */
export interface ProductoBackgroundConfig {
  titulo: string;
  imagenes: ProductoBackgroundImage[];
  mostrar: boolean; // Indica si debe mostrarse este componente para esta categoría
}

@Injectable({
  providedIn: 'root'
})
export class ProductoBackgroundService {

  /**
   * Base de datos de configuraciones por categoría
   * Clave: nombre de la categoría
   * Valor: configuración de ProductoBackground
   */
  private configByCategoria: Record<string, ProductoBackgroundConfig> = {
    'Pisos': {
      titulo: 'Pisos Vinílicos',
      mostrar: true,
      imagenes: [
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446214/piso-img1_v5gmze.jpg',
          alt: 'Piso Vinílico 1',
          title: 'Pisos Vinílicos Premium',
          description: 'Descubre nuestra colección de pisos vinílicos de alta calidad',
          link: '#pisos'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446214/piso-img2_kkuirj.jpg',
          alt: 'Piso Vinílico 2',
          title: 'Durabilidad Garantizada',
          description: 'Resistentes al agua y fáciles de limpiar',
          link: '#pisos'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446214/piso-img3_iig906.jpg',
          alt: 'Piso Vinílico 3',
          title: 'Estilos Variados',
          description: 'Múltiples diseños para decorar tu espacio',
          link: '#pisos'
        }
      ]
    },
    'Yumbolon': {
      titulo: 'Yumbolón',
      mostrar: true,
      imagenes: [
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446215/yumbo-img_cq954s.jpg',
          alt: 'Yumbolón 1',
          title: 'Yumbolón Premium',
          description: 'Descubre nuestra colección de yumbolón de alta calidad',
          link: '#yumbolon'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446215/yumbo-img3_rrgkc5.jpg',
          alt: 'Yumbolón 2',
          title: 'Comodidad Garantizada',
          description: 'Material resistente y duradero para tu hogar',
          link: '#yumbolon'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768446215/yumbo-img2_aef0kj.jpg',
          alt: 'Yumbolón 3',
          title: 'Estilos Variados',
          description: 'Múltiples diseños para decorar tu espacio',
          link: '#yumbolon'
        }
      ]
    },
    'Espumas': {
      titulo: 'Espumas',
      mostrar: true,
      imagenes: [
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448886/espuma-img_jwvz5l.jpg',
          alt: 'Espuma 1',
          title: 'Espumas Premium',
          description: 'Descubre nuestra colección de espumas de alta calidad',
          link: '#espumas'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448887/espuma-img2_geau97.jpg',
          alt: 'Espuma 2',
          title: 'Confort Máximo',
          description: 'Material suave y resistente para tu comodidad',
          link: '#espumas'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448887/espuma-img3_bkljqg.jpg',
          alt: 'Espuma 3',
          title: 'Durabilidad Comprobada',
          description: 'Excelente relación calidad-precio',
          link: '#espumas'
        }
      ]
    },
    'Mallas': {
      titulo: 'Mallas',
      mostrar: true,
      imagenes: [
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448893/malla-img_ptr7dj.jpg',
          alt: 'Malla 1',
          title: 'Mallas Premium',
          description: 'Descubre nuestra colección de mallas de alta calidad',
          link: '#mallas'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448894/malla-img2_xpbole.jpg',
          alt: 'Malla 2',
          title: 'Resistencia Total',
          description: 'Material duradero y versátil para múltiples usos',
          link: '#mallas'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448897/malla-img3_umwtgi.jpg',
          alt: 'Malla 3',
          title: 'Variedad de Tamaños',
          description: 'Encuentra el tamaño perfecto para tu necesidad',
          link: '#mallas'
        }
      ]
    },
    'Mimbres': {
      titulo: 'Mimbres',
      mostrar: true,
      imagenes: [
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448898/mimbre-img_gcvoyc.jpg',
          alt: 'Mimbre 1',
          title: 'Mimbres Naturales',
          description: 'Descubre nuestra colección de mimbres naturales',
          link: '#mimbres'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448902/mimbre-img2_lnw60f.jpg',
          alt: 'Mimbre 2',
          title: 'Elegancia Natural',
          description: 'Material ecológico y resistente',
          link: '#mimbres'
        },
        {
          url: 'https://res.cloudinary.com/dsv1gdgya/image/upload/v1768448902/mimbre-img3_htk1uk.jpg',
          alt: 'Mimbre 3',
          title: 'Diseños Únicos',
          description: 'Cada pieza con carácter especial',
          link: '#mimbres'
        }
      ]
    }
    // Aquí irán las otras categorías
  };

  constructor() {}

  /**
   * Obtener configuración de ProductoBackground por nombre de categoría
   * @param nombreCategoria - Nombre de la categoría (ej: 'Pisos Vinílicos')
   * @returns Configuración de ProductoBackground o undefined si no existe
   */
  obtenerConfiguracionPorCategoria(nombreCategoria: string): ProductoBackgroundConfig | undefined {
    if (!nombreCategoria) {
      return undefined;
    }

    // Buscar configuración exacta
    const config = this.configByCategoria[nombreCategoria];
    
    if (config) {
      console.log(`✅ Configuración encontrada para categoría: ${nombreCategoria}`);
      return config;
    }

    console.log(`⚠️ No hay configuración para la categoría: ${nombreCategoria}`);
    return undefined;
  }

  /**
   * Obtener solo las imágenes de una categoría
   * @param nombreCategoria - Nombre de la categoría
   * @returns Array de imágenes o undefined
   */
  obtenerImagenesPorCategoria(nombreCategoria: string): ProductoBackgroundImage[] | undefined {
    const config = this.obtenerConfiguracionPorCategoria(nombreCategoria);
    return config?.imagenes;
  }

  /**
   * Verificar si una categoría tiene ProductoBackground configurado
   * @param nombreCategoria - Nombre de la categoría
   * @returns true si debe mostrarse el componente
   */
  debeEmostrarse(nombreCategoria: string): boolean {
    const config = this.obtenerConfiguracionPorCategoria(nombreCategoria);
    return config?.mostrar ?? false;
  }

  /**
   * Obtener todas las categorías que tienen ProductoBackground configurado
   * @returns Array de nombres de categorías
   */
  obtenerCategoriasConProductoBackground(): string[] {
    return Object.keys(this.configByCategoria).filter(
      categoria => this.configByCategoria[categoria].mostrar
    );
  }

  /**
   * Agregar o actualizar configuración para una categoría
   * @param nombreCategoria - Nombre de la categoría
   * @param config - Configuración de ProductoBackground
   */
  agregarOActualizarConfiguracion(
    nombreCategoria: string,
    config: ProductoBackgroundConfig
  ): void {
    this.configByCategoria[nombreCategoria] = config;
    console.log(`💾 Configuración guardada para categoría: ${nombreCategoria}`);
  }

  /**
   * Agregar múltiples configuraciones de una vez
   * @param configuraciones - Objeto con configuraciones por categoría
   */
  agregarMultiplesConfiguraciones(
    configuraciones: Record<string, ProductoBackgroundConfig>
  ): void {
    this.configByCategoria = {
      ...this.configByCategoria,
      ...configuraciones
    };
    console.log('💾 Múltiples configuraciones guardadas');
  }

  /**
   * Remover configuración de una categoría
   * @param nombreCategoria - Nombre de la categoría
   */
  removerConfiguracion(nombreCategoria: string): void {
    delete this.configByCategoria[nombreCategoria];
    console.log(`🗑️ Configuración removida para categoría: ${nombreCategoria}`);
  }

  /**
   * Limpiar todas las configuraciones
   */
  limpiarTodas(): void {
    this.configByCategoria = {};
    console.log('🗑️ Todas las configuraciones han sido removidas');
  }
}
