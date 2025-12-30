import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicBackground } from './dynamic-background';

describe('DynamicBackground', () => {
  let component: DynamicBackground;
  let fixture: ComponentFixture<DynamicBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicBackground]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicBackground);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
