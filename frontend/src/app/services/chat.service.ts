import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  isChatOpen$ = this.isChatOpenSubject.asObservable();

  toggleChat() {
    this.isChatOpenSubject.next(!this.isChatOpenSubject.value);
  }

  openChat() {
    this.isChatOpenSubject.next(true);
  }

  closeChat() {
    this.isChatOpenSubject.next(false);
  }
}
