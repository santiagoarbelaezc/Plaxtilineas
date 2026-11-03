import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SquareMap } from './square-map.component';

describe('SquareMap', () => {
  let component: SquareMap;
  let fixture: ComponentFixture<SquareMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SquareMap],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
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
