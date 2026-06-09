import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { NotificationService } from './core/services/notification.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand link', () => {
    const brandEl = fixture.debugElement.query(By.css('.app-header__brand'));
    expect(brandEl).toBeTruthy();
    expect(brandEl.nativeElement.textContent).toContain('Nice Media Player');
  });

  it('should have a skip-to-content link', () => {
    const skipLink = fixture.debugElement.query(By.css('.skip-link'));
    expect(skipLink).toBeTruthy();
    expect(skipLink.nativeElement.getAttribute('href')).toBe('#main');
  });

  it('should render navigation links for Browse and History', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('.app-header__nav a'));
    expect(navLinks.length).toBe(2);
    expect(navLinks[0].nativeElement.textContent).toContain('Browse');
    expect(navLinks[1].nativeElement.textContent).toContain('History');
  });

  it('should contain a router-outlet', () => {
    const outlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(outlet).toBeTruthy();
  });

  it('should contain the toast component', () => {
    const toast = fixture.debugElement.query(By.css('app-toast'));
    expect(toast).toBeTruthy();
  });

  it('should have a main element with id "main"', () => {
    const main = fixture.debugElement.query(By.css('main#main'));
    expect(main).toBeTruthy();
  });
});
