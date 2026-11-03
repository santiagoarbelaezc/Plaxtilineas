import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarVisibilityService {
  private ngZone = inject(NgZone);
  private isHiddenSubject = new BehaviorSubject<boolean>(false);
  public isHidden$: Observable<boolean> = this.isHiddenSubject.asObservable();

  private activeSources = new Set<string>();

  public get isHidden(): boolean {
    return this.isHiddenSubject.value;
  }

  public setHidden(hidden: boolean): void {
    if (this.isHiddenSubject.value !== hidden) {
      this.ngZone.run(() => {
        this.isHiddenSubject.next(hidden);
      });
    }
  }

  public registerHidden(sourceId: string, hidden: boolean): void {
    if (hidden) {
      this.activeSources.add(sourceId);
    } else {
      this.activeSources.delete(sourceId);
    }
    const shouldHide = this.activeSources.size > 0;
    if (this.isHiddenSubject.value !== shouldHide) {
      this.ngZone.run(() => {
        this.isHiddenSubject.next(shouldHide);
      });
    }
  }
}
