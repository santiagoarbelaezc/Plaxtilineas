import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PqrClienteComponent } from './pqr-cliente';

describe('PqrClienteComponent', () => {
  let component: PqrClienteComponent;
  let fixture: ComponentFixture<PqrClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PqrClienteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PqrClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
