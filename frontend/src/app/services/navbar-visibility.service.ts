import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavbarVisibilityService {
  private ngZone = inject(NgZone);
  private isHiddenSubject = new BehaviorSubject<boolean>(false);
  public isHidden$: Observable<boolean> = this.isHiddenSubject.asObservable();

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
}
