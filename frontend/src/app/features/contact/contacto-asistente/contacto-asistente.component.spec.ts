import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactoAsistente } from './contacto-asistente.component';

describe('ContactoAsistente', () => {
  let component: ContactoAsistente;
  let fixture: ComponentFixture<ContactoAsistente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoAsistente],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactoAsistente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
