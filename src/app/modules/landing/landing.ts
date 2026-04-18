import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './landing.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Landing {
  auth = inject(AuthService);
  router = inject(Router);

  handleDeepLink(path: string) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([path]);
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: path } });
    }
  }
}
