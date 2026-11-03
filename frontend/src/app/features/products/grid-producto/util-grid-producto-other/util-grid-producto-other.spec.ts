import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilGridProductoOther } from './util-grid-producto-other';

describe('UtilGridProductoOther', () => {
  let component: UtilGridProductoOther;
  let fixture: ComponentFixture<UtilGridProductoOther>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilGridProductoOther],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilGridProductoOther);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
