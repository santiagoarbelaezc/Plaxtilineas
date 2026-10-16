import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoBackground } from './producto-background';

describe('ProductoBackground', () => {
  let component: ProductoBackground;
  let fixture: ComponentFixture<ProductoBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoBackground]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoBackground);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
