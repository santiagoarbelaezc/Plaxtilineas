import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsSearch } from './products-search';

describe('ProductsSearch', () => {
  let component: ProductsSearch;
  let fixture: ComponentFixture<ProductsSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
