import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriasDestacadasComponent } from './categorias-destacadas.component';

describe('CategoriasDestacadas', () => {
  let component: CategoriasDestacadasComponent;
  let fixture: ComponentFixture<CategoriasDestacadasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriasDestacadasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoriasDestacadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
