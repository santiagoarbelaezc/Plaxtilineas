import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/layout/navbar/navbar.component';
import { Footer } from '../../shared/layout/footer/footer.component';

@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, Footer],
  templateUrl: './aviso-legal.html',
  styleUrls: ['./aviso-legal.css']
})
export class AvisoLegal implements OnInit {
  constructor() { }
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
