import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAX_RETRIES, retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('retries a 500 up to MAX_RETRIES then errors', fakeAsync(() => {
    let errored = false;
    http.get('/api/test').subscribe({
      error: () => (errored = true),
    });

    // initial + MAX_RETRIES attempts
    httpMock.expectOne('/api/test').flush('err', { status: 500, statusText: 'Server Error' });
    tick(500);
    httpMock.expectOne('/api/test').flush('err', { status: 500, statusText: 'Server Error' });
    tick(1000);
    httpMock.expectOne('/api/test').flush('err', { status: 500, statusText: 'Server Error' });

    expect(errored).toBeTrue();
    expect(MAX_RETRIES).toBe(2);
  }));

  it('retries a 429 (rate limit)', fakeAsync(() => {
    let errored = false;
    http.get('/api/test').subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/api/test').flush('rl', { status: 429, statusText: 'Too Many Requests' });
    tick(500);
    httpMock.expectOne('/api/test').flush('rl', { status: 429, statusText: 'Too Many Requests' });
    tick(1000);
    httpMock.expectOne('/api/test').flush('rl', { status: 429, statusText: 'Too Many Requests' });

    expect(errored).toBeTrue();
  }));

  it('does NOT retry a 4xx (fails fast)', fakeAsync(() => {
    let status = 0;
    http.get('/api/test').subscribe({
      error: (e) => (status = e.status),
    });

    httpMock.expectOne('/api/test').flush('bad', { status: 400, statusText: 'Bad Request' });
    tick(2000);
    httpMock.expectNone('/api/test'); // no further attempts

    expect(status).toBe(400);
  }));

  it('succeeds without retry on 200', fakeAsync(() => {
    let body: unknown;
    http.get('/api/test').subscribe((b) => (body = b));
    httpMock.expectOne('/api/test').flush({ ok: true });
    tick();
    expect(body).toEqual({ ok: true });
  }));
});
