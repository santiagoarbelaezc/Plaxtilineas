import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullBanner } from './full-banner';

describe('FullBanner', () => {
  let component: FullBanner;
  let fixture: ComponentFixture<FullBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullBanner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
