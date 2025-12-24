// src/app/services/menu-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MenuState {
  expandedCategories: number[];
  scrollPosition?: number;
  lastSelectedSubcategory?: number; // ⭐ NUEVO: última subcategoría seleccionada
}

@Injectable({
  providedIn: 'root'
})
export class MenuStateService {
  private readonly STORAGE_KEY = 'menu_categorias_state';
  private stateSubject = new BehaviorSubject<MenuState>(this.getInitialState());
  
  state$ = this.stateSubject.asObservable();

  constructor() {
    console.log('✅ MenuStateService inicializado');
  }

  private getInitialState(): MenuState {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        console.log('📂 Estado cargado del localStorage:', state);
        return state;
      }
    } catch (error) {
      console.error('❌ Error al cargar estado:', error);
    }
    return { expandedCategories: [] };
  }

  private saveState(state: MenuState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      this.stateSubject.next(state);
      console.log('💾 Estado guardado:', state);
    } catch (error) {
      console.error('❌ Error al guardar estado:', error);
    }
  }

  private updateState(updater: (current: MenuState) => MenuState): void {
    const currentState = this.stateSubject.value;
    const newState = updater(currentState);
    this.saveState(newState);
  }
  /**
   * Toggle de categoría
   */
  toggleCategory(categoryId: number, isExpanded: boolean): void {
    this.updateState(current => {
      let newExpanded = [...current.expandedCategories];
      
      if (isExpanded) {
        // Agregar si no existe
        if (!newExpanded.includes(categoryId)) {
          newExpanded.push(categoryId);
        }
      } else {
        // Remover si existe
        newExpanded = newExpanded.filter(id => id !== categoryId);
      }
      
      return {
        ...current,
        expandedCategories: newExpanded
      };
    });
  }

  /**
   * Expandir categoría específica
   */
  expandCategory(categoryId: number): void {
    this.toggleCategory(categoryId, true);
  }

  /**
   * Contraer categoría específica
   */
  collapseCategory(categoryId: number): void {
    this.toggleCategory(categoryId, false);
  }

  /**
   * Obtener categorías expandidas
   */
  getExpandedCategories(): number[] {
    return this.stateSubject.value.expandedCategories;
  }

  /**
   * Verificar si una categoría está expandida
   */
  isCategoryExpanded(categoryId: number): boolean {
    return this.stateSubject.value.expandedCategories.includes(categoryId);
  }

  /**
   * Limpiar estado
   */
  clearState(): void {
    this.saveState({ expandedCategories: [] });
  }

  /**
   * Guardar posición de scroll
   */
  saveScrollPosition(position: number): void {
    this.updateState(current => ({
      ...current,
      scrollPosition: position
    }));
  }

  /**
   * Obtener posición de scroll
   */
  getScrollPosition(): number | undefined {
    return this.stateSubject.value.scrollPosition;
  }

  /**
   * ⭐ NUEVO: Guardar última subcategoría seleccionada
   */
  saveLastSelectedSubcategory(subcategoryId: number): void {
    this.updateState(current => ({
      ...current,
      lastSelectedSubcategory: subcategoryId
    }));
    console.log(`📌 Subcategoría ${subcategoryId} guardada como última seleccionada`);
  }

  /**
   * ⭐ NUEVO: Obtener última subcategoría seleccionada
   */
  getLastSelectedSubcategory(): number | undefined {
    return this.stateSubject.value.lastSelectedSubcategory;
  }

  /**
   * ⭐ NUEVO: Limpiar última subcategoría seleccionada
   */
  clearLastSelectedSubcategory(): void {
    this.updateState(current => ({
      ...current,
      lastSelectedSubcategory: undefined
    }));
  }
}
