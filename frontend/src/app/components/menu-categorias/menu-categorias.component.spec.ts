import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuCategoriasComponent } from './menu-categorias.component';

describe('MenuCategoriasComponent', () => {
  let component: MenuCategoriasComponent;
  let fixture: ComponentFixture<MenuCategoriasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuCategoriasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuCategoriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
