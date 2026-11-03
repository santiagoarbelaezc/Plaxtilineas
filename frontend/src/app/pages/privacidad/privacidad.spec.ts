import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Privacidad } from './privacidad';

describe('Privacidad', () => {
  let component: Privacidad;
  let fixture: ComponentFixture<Privacidad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacidad],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Privacidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
