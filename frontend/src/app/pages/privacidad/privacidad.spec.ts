import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Privacidad } from './privacidad';

describe('Privacidad', () => {
  let component: Privacidad;
  let fixture: ComponentFixture<Privacidad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacidad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Privacidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
