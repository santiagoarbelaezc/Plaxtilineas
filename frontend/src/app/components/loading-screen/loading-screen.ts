import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-screen.html',
  styleUrls: ['./loading-screen.css']
})
export class LoadingScreenComponent {
  @Input() isVisible: boolean = true;
}
