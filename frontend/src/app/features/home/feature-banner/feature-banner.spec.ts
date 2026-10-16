import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureBanner } from './feature-banner';

describe('FeatureBanner', () => {
  let component: FeatureBanner;
  let fixture: ComponentFixture<FeatureBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeatureBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
