import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullBanner } from './full-banner';

describe('FullBanner', () => {
  let component: FullBanner;
  let fixture: ComponentFixture<FullBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullBanner]
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
