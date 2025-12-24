import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselInteres } from './carousel-interes';

describe('CarouselInteres', () => {
  let component: CarouselInteres;
  let fixture: ComponentFixture<CarouselInteres>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarouselInteres]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarouselInteres);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
