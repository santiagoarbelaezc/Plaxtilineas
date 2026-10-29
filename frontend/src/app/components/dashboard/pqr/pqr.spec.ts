import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PqrAdminComponent } from './pqr';

describe('PqrAdminComponent', () => {
  let component: PqrAdminComponent;
  let fixture: ComponentFixture<PqrAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PqrAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PqrAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
