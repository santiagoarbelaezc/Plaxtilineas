import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaxtiTrioPresentationComponent } from './trio-presentation';

describe('PlaxtiTrioPresentationComponent', () => {
  let component: PlaxtiTrioPresentationComponent;
  let fixture: ComponentFixture<PlaxtiTrioPresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaxtiTrioPresentationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaxtiTrioPresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
