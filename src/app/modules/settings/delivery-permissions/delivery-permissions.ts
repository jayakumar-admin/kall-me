import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';
import { LoaderService } from '../../../services/loader.service';
import { ToastService } from '../../../services/toast.service';
import { DeliveryPermission } from '../../../models';

@Component({
  selector: 'app-delivery-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './delivery-permissions.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryPermissions implements OnInit {
  private api = inject(ApiService);
  private loader = inject(LoaderService);
  private toast = inject(ToastService);

  permissions = signal<DeliveryPermission[]>([]);
  
  // Available modules for delivery personnel
  modules = ['Dashboard', 'Assigned Orders', 'Profile'];

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.loader.show('Loading permissions...');
    this.api.getDeliveryPermissions().subscribe({
      next: (data) => {
        this.permissions.set(data);
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to load permissions', 'error');
      }
    });
  }

  togglePermission(permission: DeliveryPermission, module: string) {
    const currentStatus = permission.permissions[module] !== false;
    const updatedPermissions = { ...permission.permissions, [module]: !currentStatus };
    
    this.loader.show('Updating permission...');
    this.api.updateDeliveryPermission(permission.userId, updatedPermissions).subscribe({
      next: () => {
        this.toast.show(`Permission for ${module} updated`, 'success');
        this.loadPermissions();
        this.loader.hide();
      },
      error: () => {
        this.loader.hide();
        this.toast.show('Failed to update permission', 'error');
      }
    });
  }
}
