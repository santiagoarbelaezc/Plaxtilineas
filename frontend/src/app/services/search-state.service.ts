import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  // Subject para compartir el estado de búsqueda
  private searchTermSubject = new BehaviorSubject<string>('');
  private isSearchingSubject = new BehaviorSubject<boolean>(false);
  private searchResultsSubject = new BehaviorSubject<any>(null);
  private searchErrorSubject = new BehaviorSubject<string>('');
  
  // Observables públicos
  searchTerm$: Observable<string> = this.searchTermSubject.asObservable();
  isSearching$: Observable<boolean> = this.isSearchingSubject.asObservable();
  searchResults$: Observable<any> = this.searchResultsSubject.asObservable();
  searchError$: Observable<string> = this.searchErrorSubject.asObservable();

  constructor() {}

  /**
   * Establece el término de búsqueda
   */
  setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  /**
   * Obtiene el término de búsqueda actual
   */
  getSearchTerm(): string {
    return this.searchTermSubject.value;
  }

  /**
   * Establece el estado de búsqueda
   */
  setIsSearching(isSearching: boolean): void {
    this.isSearchingSubject.next(isSearching);
  }

  /**
   * Establece los resultados de búsqueda
   */
  setSearchResults(results: any): void {
    this.searchResultsSubject.next(results);
  }

  /**
   * Establece un error de búsqueda
   */
  setSearchError(error: string): void {
    this.searchErrorSubject.next(error);
  }

  /**
   * Limpia el estado de búsqueda
   */
  clearSearch(): void {
    this.searchTermSubject.next('');
    this.searchResultsSubject.next(null);
    this.searchErrorSubject.next('');
    this.isSearchingSubject.next(false);
  }

  /**
   * Notifica que se ha realizado una búsqueda desde el navbar
   */
  triggerSearchFromNavbar(term: string): void {
    this.setSearchTerm(term);
    this.setIsSearching(true);
  }
}