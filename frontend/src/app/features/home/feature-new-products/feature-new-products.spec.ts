import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureNewProducts } from './feature-new-products';

describe('FeatureNewProducts', () => {
  let component: FeatureNewProducts;
  let fixture: ComponentFixture<FeatureNewProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureNewProducts]
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
