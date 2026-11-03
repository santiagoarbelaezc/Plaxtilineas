import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  const mockUrlTree = {} as UrlTree;
  let routerSpy: { parseUrl: jasmine.Spy; createUrlTree: jasmine.Spy };

  beforeEach(() => {
    routerSpy = {
      parseUrl: jasmine.createSpy('parseUrl').and.returnValue(mockUrlTree),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(mockUrlTree)
    };

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
    const result = guard.canActivate({} as any, { url: '/carrito' } as any);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/carrito' }
    });
    expect(result).toBe(mockUrlTree);
  });
});
