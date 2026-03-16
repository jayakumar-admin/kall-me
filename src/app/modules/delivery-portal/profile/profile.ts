import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { LoaderService } from '../../../services/loader.service';
import { ToastService } from '../../../services/toast.service';
import { DeliveryUser } from '../../../models';

@Component({
  selector: 'app-delivery-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryProfile implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private loader = inject(LoaderService);
  private toast = inject(ToastService);

  profile = signal<DeliveryUser | null>(null);
  isEditing = signal(false);
  showChangePassword = signal(false);
  
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loader.show('Loading profile...');
    this.api.getDeliveryProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to load profile', 'error');
      }
    });
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
  }

  saveProfile() {
    const data = this.profile();
    if (!data) return;

    this.loader.show('Saving profile...');
    this.api.updateDeliveryProfile(data).subscribe({
      next: () => {
        this.toast.show('Profile updated successfully', 'success');
        this.isEditing.set(false);
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to update profile', 'error');
      }
    });
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.toast.show('Passwords do not match', 'error');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.toast.show('Password must be at least 6 characters', 'error');
      return;
    }

    this.loader.show('Changing password...');
    this.auth.changePassword({
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        this.toast.show('Password changed successfully', 'success');
        this.showChangePassword.set(false);
        this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.loader.hide();
      },
      error: (err) => {
        this.loader.hide();
        this.toast.show(err.error?.error || 'Failed to change password', 'error');
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}
