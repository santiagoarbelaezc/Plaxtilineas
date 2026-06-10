import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService, DashboardStats } from '../../../services/stats.service';
import { LeadsService } from '../../../services/leads.service';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faCalendarAlt, faBox, faUsers } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-analiticas',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './analiticas.html',
  styleUrls: ['./analiticas.css']
})
export class Analiticas implements OnInit {
  faEye = faEye;
  faCalendarAlt = faCalendarAlt;
  faBox = faBox;
  faUsers = faUsers;
  
  stats: DashboardStats | null = null;
  cargando = true;
  error = '';

  // Leads
  leads: any[] = [];
  leadsTotal = 0;
  leadsPagina = 1;
  leadsBuscar = '';
  cargandoLeads = false;

  // Helpers para gráficos SVG
  maxVisitas = 1;
  chartWidth = 600;
  chartHeight = 120;

  constructor(
    private statsService: StatsService,
    private leadsService: LeadsService
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarLeads();
  }

  cargarEstadisticas(): void {
    console.log('📊 Iniciando carga de estadísticas desde StatsService...');
    this.cargando = true;
    this.error = '';
    this.statsService.getDashboardStats().subscribe({
      next: (res: any) => {
        console.log('✅ Estadísticas cargadas en AnaliticasComponent:', res);
        this.stats = res; // <--- Cambiado de res.data a res
        console.log('📦 Objeto stats mapeado:', this.stats);
        if (this.stats?.grafico_visitas?.length) {
          this.maxVisitas = Math.max(...this.stats.grafico_visitas.map(v => v.total), 1);
          console.log('📈 Máximo de visitas para SVG:', this.maxVisitas);
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar estadísticas en AnaliticasComponent:', err);
        this.error = 'Error al cargar las estadísticas. Verifica que el backend local esté corriendo.';
        this.cargando = false;
      }
    });
  }

  cargarLeads(): void {
    console.log('👥 Iniciando carga de leads desde LeadsService...');
    this.cargandoLeads = true;
    this.leadsService.getLeads(this.leadsPagina, 10, this.leadsBuscar).subscribe({
      next: (res) => {
        console.log('✅ Leads cargados en AnaliticasComponent:', res);
        this.leads = res.leads || [];
        this.leadsTotal = res.total || 0;
        this.cargandoLeads = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar leads en AnaliticasComponent:', err);
        this.cargandoLeads = false;
      }
    });
  }

  buscarLeads(): void {
    this.leadsPagina = 1;
    this.cargarLeads();
  }

  // Generar puntos SVG para el gráfico de líneas
  getPolylinePoints(): string {
    if (!this.stats || !this.stats.grafico_visitas || !this.stats.grafico_visitas.length) return '';
    const data = this.stats.grafico_visitas;
    const w = this.chartWidth;
    const h = this.chartHeight;
    const step = w / (data.length - 1 || 1);
    return data.map((d, i) => {
      if (!d) return '0,0';
      const total = d.total || 0;
      const x = i * step;
      const y = h - (total / (this.maxVisitas || 1)) * (h - 10);
      return `${x},${y}`;
    }).join(' ');
  }

  getAreaPoints(): string {
    if (!this.stats || !this.stats.grafico_visitas || !this.stats.grafico_visitas.length) return '';
    const line = this.getPolylinePoints();
    if (!line) return '';
    const w = this.chartWidth;
    const h = this.chartHeight;
    return `0,${h} ${line} ${w},${h}`;
  }

  // Calcular % para barras horizontales
  getBarWidth(valor: number, max: number): string {
    if (!max) return '0%';
    return `${Math.min(100, (valor / max) * 100)}%`;
  }

  getMaxVisitasCategoria(): number {
    return Math.max(...(this.stats?.visitas_categoria?.map(v => v.visitas) || [1]), 1);
  }

  getMaxVisitasProductos(): number {
    return Math.max(...(this.stats?.top_productos?.map(p => p.visitas) || [1]), 1);
  }

  getDiferenciaClass(): string {
    const dif = this.stats?.resumen?.diferencia_hoy ?? 0;
    return dif >= 0 ? 'positivo' : 'negativo';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  formatFechaCompleta(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
