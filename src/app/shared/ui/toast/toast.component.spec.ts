import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ToastComponent } from './toast.component';
import { NotificationService } from '../../../core/services/notification.service';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let component: ToastComponent;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService);
    notificationService.autoDismissMs = 0; // Disable auto-dismiss in tests.
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render no toasts when there are no notifications', () => {
    const toasts = fixture.debugElement.queryAll(By.css('.toast'));
    expect(toasts.length).toBe(0);
  });

  it('should render a toast when a notification is added', () => {
    notificationService.notify('Hello world', 'info');
    fixture.detectChanges();

    const toasts = fixture.debugElement.queryAll(By.css('.toast'));
    expect(toasts.length).toBe(1);
    expect(toasts[0].nativeElement.textContent).toContain('Hello world');
  });

  it('should apply the correct CSS class based on notification level', () => {
    notificationService.notify('Error occurred', 'error');
    fixture.detectChanges();

    const toast = fixture.debugElement.query(By.css('.toast'));
    expect(toast.nativeElement.classList).toContain('toast--error');
  });

  it('should apply info class for info notifications', () => {
    notificationService.notify('Info message', 'info');
    fixture.detectChanges();

    const toast = fixture.debugElement.query(By.css('.toast'));
    expect(toast.nativeElement.classList).toContain('toast--info');
  });

  it('should apply success class for success notifications', () => {
    notificationService.notify('Success!', 'success');
    fixture.detectChanges();

    const toast = fixture.debugElement.query(By.css('.toast'));
    expect(toast.nativeElement.classList).toContain('toast--success');
  });

  it('should render multiple toasts for multiple notifications', () => {
    notificationService.notify('First', 'info');
    notificationService.notify('Second', 'error');
    fixture.detectChanges();

    const toasts = fixture.debugElement.queryAll(By.css('.toast'));
    expect(toasts.length).toBe(2);
  });

  it('should dismiss a notification when the close button is clicked', () => {
    notificationService.notify('Dismissable', 'info');
    fixture.detectChanges();

    const closeBtn = fixture.debugElement.query(By.css('.toast__close'));
    expect(closeBtn).toBeTruthy();
    closeBtn.nativeElement.click();
    fixture.detectChanges();

    const toasts = fixture.debugElement.queryAll(By.css('.toast'));
    expect(toasts.length).toBe(0);
  });

  it('should have an aria-live region for accessibility', () => {
    const region = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(region).toBeTruthy();
    expect(region.nativeElement.getAttribute('role')).toBe('status');
  });

  it('should set aria-label on dismiss button', () => {
    notificationService.notify('Test msg', 'info');
    fixture.detectChanges();

    const closeBtn = fixture.debugElement.query(By.css('.toast__close'));
    expect(closeBtn.nativeElement.getAttribute('aria-label')).toContain(
      'Dismiss notification: Test msg',
    );
  });
});
