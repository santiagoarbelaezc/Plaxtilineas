import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselRelacionados } from './carousel-relacionados';

describe('CarouselRelacionados', () => {
  let component: CarouselRelacionados;
  let fixture: ComponentFixture<CarouselRelacionados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarouselRelacionados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarouselRelacionados);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
