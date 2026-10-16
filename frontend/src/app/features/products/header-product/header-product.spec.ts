import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderProduct } from './header-product';

describe('HeaderProduct', () => {
  let component: HeaderProduct;
  let fixture: ComponentFixture<HeaderProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderProduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
