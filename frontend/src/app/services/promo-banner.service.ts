import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PromoBannerService {
  private isBannerVisibleSubject = new BehaviorSubject<boolean>(false);
  isBannerVisible$ = this.isBannerVisibleSubject.asObservable();

  setBannerVisible(visible: boolean): void {
    this.isBannerVisibleSubject.next(visible);
  }
}
