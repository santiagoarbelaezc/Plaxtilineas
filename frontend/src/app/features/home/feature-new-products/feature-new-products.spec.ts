import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureNewProducts } from './feature-new-products';

describe('FeatureNewProducts', () => {
  let component: FeatureNewProducts;
  let fixture: ComponentFixture<FeatureNewProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureNewProducts],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeatureNewProducts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
