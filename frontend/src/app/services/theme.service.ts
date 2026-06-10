import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('light');
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    // Si hay un tema guardado, úsalo, si no, usa 'light' por defecto (elegante)
    const savedTheme = localStorage.getItem('dashboard-theme') as Theme;
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    this.setTheme(initialTheme);
  }

  public setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem('dashboard-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  public toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  public getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }
}
