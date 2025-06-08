import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotonesSociales } from './social-buttons.component';

describe('BotonesSociales', () => {
  let component: BotonesSociales;
  let fixture: ComponentFixture<BotonesSociales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotonesSociales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BotonesSociales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
