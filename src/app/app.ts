import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { LoaderComponent } from './components/loader';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoaderComponent],
  template: `
    <router-outlet />
    <app-toast />
    <app-loader />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private theme = inject(ThemeService);
  constructor() {
    console.log('App component initialized');
  }
}
