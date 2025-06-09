import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let routerSpy = { parseUrl: jasmine.createSpy('parseUrl') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('debe permitir acceso si hay token', () => {
    spyOn(localStorage, 'getItem').and.returnValue('fake-token');
    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
  });

  it('debe redirigir al login si NO hay token', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null);
    guard.canActivate({} as any, {} as any);
    expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
  });
});
