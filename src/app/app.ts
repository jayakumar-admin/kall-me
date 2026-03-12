import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { LoaderComponent } from './components/loader';

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
export class App {}
