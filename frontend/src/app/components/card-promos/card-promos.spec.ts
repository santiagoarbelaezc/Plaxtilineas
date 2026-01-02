import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardPromos } from './card-promos';

describe('CardPromos', () => {
  let component: CardPromos;
  let fixture: ComponentFixture<CardPromos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardPromos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardPromos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
