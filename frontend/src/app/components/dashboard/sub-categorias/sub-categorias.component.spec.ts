import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubCategoriasComponent } from './sub-categorias.component';

describe('SubCategorias', () => {
  let component: SubCategoriasComponent;
  let fixture: ComponentFixture<SubCategoriasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubCategoriasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubCategoriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
