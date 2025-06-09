import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubCategorias } from './sub-categorias';

describe('SubCategorias', () => {
  let component: SubCategorias;
  let fixture: ComponentFixture<SubCategorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubCategorias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubCategorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
