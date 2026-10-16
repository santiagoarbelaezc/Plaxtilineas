import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PqrCliente } from './pqr-cliente';

describe('PqrCliente', () => {
  let component: PqrCliente;
  let fixture: ComponentFixture<PqrCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PqrCliente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PqrCliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
