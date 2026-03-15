import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  theme = inject(ThemeService);

  loginForm = this.fb.group({
    email: ['admin@kallme.com', [Validators.required, Validators.email]],
    password: ['password123', [Validators.required]]
  });

  loading = false;
  showPassword = signal(false);

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.auth.login(this.loginForm.value as { email?: string | null; password?: string | null }).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err) => {
          console.error('Login failed', err);
          alert('Invalid credentials or server error');
          this.loading = false;
        }
      });
    }
  }
}
