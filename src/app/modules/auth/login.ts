import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  theme = inject(ThemeService);

  loginForm = this.fb.group({
    email: ['admin@kallme.com', [Validators.required]],
    password: ['password123', [Validators.required]]
  });

  loading = signal(false);
  showPassword = signal(false);

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.auth.login(this.loginForm.value as { email?: string | null; password?: string | null }).subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Login failed', err);
          alert('Invalid credentials or server error');
          this.loading.set(false);
        }
      });
    }
  }
}
