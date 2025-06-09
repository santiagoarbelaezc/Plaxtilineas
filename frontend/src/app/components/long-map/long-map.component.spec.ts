import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongMap } from './long-map.component';

describe('LongMap', () => {
  let component: LongMap;
  let fixture: ComponentFixture<LongMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LongMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
