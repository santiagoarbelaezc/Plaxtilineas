import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrioPresentation } from './trio-presentation';

describe('TrioPresentation', () => {
  let component: TrioPresentation;
  let fixture: ComponentFixture<TrioPresentation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrioPresentation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrioPresentation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
