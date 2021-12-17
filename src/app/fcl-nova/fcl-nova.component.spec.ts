import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FclNovaComponent } from './fcl-nova.component';

describe('FclNovaComponent', () => {
  let component: FclNovaComponent;
  let fixture: ComponentFixture<FclNovaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FclNovaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FclNovaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
