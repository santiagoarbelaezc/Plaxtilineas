export interface ContentCard {
  imageUrl: string;    // URL de la imagen PNG
  altText: string;     // Texto alternativo
  title: string;       // Título principal
  description: string; // Descripción corta
  link?: string;       // Enlace opcional
  textPosition?: 'top' | 'bottom' | 'center'; // Posición del texto
  icon?: string;       // Ícono opcional (para estilo PlaxtiLineas)
}