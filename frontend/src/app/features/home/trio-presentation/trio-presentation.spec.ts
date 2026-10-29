import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaxtiTrioPresentationComponent } from './trio-presentation';

describe('PlaxtiTrioPresentationComponent', () => {
  let component: PlaxtiTrioPresentationComponent;
  let fixture: ComponentFixture<PlaxtiTrioPresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaxtiTrioPresentationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaxtiTrioPresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
