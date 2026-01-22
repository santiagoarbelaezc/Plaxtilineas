import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilGridProducto } from './util-grid-producto';

describe('UtilGridProducto', () => {
  let component: UtilGridProducto;
  let fixture: ComponentFixture<UtilGridProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilGridProducto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilGridProducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
