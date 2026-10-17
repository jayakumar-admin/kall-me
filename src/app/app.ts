import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { LoaderComponent } from './components/loader';
import { MasterPasswordModalComponent } from './components/master-password-modal/master-password-modal.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoaderComponent, MasterPasswordModalComponent],
  template: `
    <router-outlet />
    <app-toast />
    <app-loader />
    <app-master-password-modal />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private theme = inject(ThemeService);
  constructor() {
    console.log('App component initialized');
  }
}
