import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuDropdown } from './menu-dropdown';

describe('MenuDropdown', () => {
  let component: MenuDropdown;
  let fixture: ComponentFixture<MenuDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuDropdown]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuDropdown);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
