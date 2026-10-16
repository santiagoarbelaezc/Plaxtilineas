import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './terminos.html',
  styleUrls: ['./terminos.css']
})
export class Terminos implements OnInit {
  constructor() { }
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
