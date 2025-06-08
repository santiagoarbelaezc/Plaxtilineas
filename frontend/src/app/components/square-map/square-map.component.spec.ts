import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SquareMap } from './square-map.component';

describe('SquareMap', () => {
  let component: SquareMap;
  let fixture: ComponentFixture<SquareMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SquareMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SquareMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
