import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicBackgroundComponent } from './dynamic-background';

describe('DynamicBackground', () => {
  let component: DynamicBackgroundComponent;
  let fixture: ComponentFixture<DynamicBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicBackgroundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
