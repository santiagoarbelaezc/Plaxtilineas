import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardBanner } from './card-banner';

describe('CardBanner', () => {
  let component: CardBanner;
  let fixture: ComponentFixture<CardBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
