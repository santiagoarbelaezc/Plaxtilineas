import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pqr } from './pqr';

describe('Pqr', () => {
  let component: Pqr;
  let fixture: ComponentFixture<Pqr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pqr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pqr);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
