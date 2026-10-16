import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptionProductoSelect } from './description-producto-select';

describe('DescriptionProductoSelect', () => {
  let component: DescriptionProductoSelect;
  let fixture: ComponentFixture<DescriptionProductoSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescriptionProductoSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescriptionProductoSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
