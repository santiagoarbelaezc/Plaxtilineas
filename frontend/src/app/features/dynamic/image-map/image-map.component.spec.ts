import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageMap } from './image-map.component';

describe('ImageMap', () => {
  let component: ImageMap;
  let fixture: ComponentFixture<ImageMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageMap],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
