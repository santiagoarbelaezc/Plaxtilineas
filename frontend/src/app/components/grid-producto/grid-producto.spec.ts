import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridProducto } from './grid-producto';

describe('GridProducto', () => {
  let component: GridProducto;
  let fixture: ComponentFixture<GridProducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridProducto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridProducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
