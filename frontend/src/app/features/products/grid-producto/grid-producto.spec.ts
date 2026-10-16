import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridProductoComponent } from './grid-producto';

describe('GridProducto', () => {
  let component: GridProductoComponent;
  let fixture: ComponentFixture<GridProductoComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridProductoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
