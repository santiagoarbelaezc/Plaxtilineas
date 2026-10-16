import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageMap } from './image-map.component';

describe('ImageMap', () => {
  let component: ImageMap;
  let fixture: ComponentFixture<ImageMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageMap]
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
