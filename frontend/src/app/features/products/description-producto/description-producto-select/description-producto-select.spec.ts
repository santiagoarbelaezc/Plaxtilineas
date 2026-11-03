import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptionProductoSelect } from './description-producto-select';

describe('DescriptionProductoSelect', () => {
  let component: DescriptionProductoSelect;
  let fixture: ComponentFixture<DescriptionProductoSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescriptionProductoSelect],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescriptionProductoSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
