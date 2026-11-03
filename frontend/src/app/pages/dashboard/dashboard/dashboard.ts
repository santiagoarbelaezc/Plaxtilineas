import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardViewComponent } from '../../../components/dashboard/dashboard-view/dashboard-view.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardViewComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {}
