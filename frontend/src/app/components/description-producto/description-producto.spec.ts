import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptionProducto } from './description-producto';

describe('DescriptionProducto', () => {
  let component: DescriptionProducto;
  let fixture: ComponentFixture<DescriptionProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescriptionProducto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescriptionProducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
