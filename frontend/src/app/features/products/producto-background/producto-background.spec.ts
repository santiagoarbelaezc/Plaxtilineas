import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoBackgroundComponent } from './producto-background';

describe('ProductoBackgroundComponent', () => {
  let component: ProductoBackgroundComponent;
  let fixture: ComponentFixture<ProductoBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoBackgroundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
