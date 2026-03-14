import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DeliveryPerson } from '../../models';

@Component({
  selector: 'app-delivery-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, ImageCropperComponent],
  templateUrl: './delivery-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryList implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  drivers = signal<DeliveryPerson[]>([]);
  filteredDrivers = signal<DeliveryPerson[]>([]);
  searchTerm = signal('');
  
  showModal = signal(false);
  editingDriver = signal<DeliveryPerson | null>(null);
  
  driverForm = this.fb.group({
    name: ['', [Validators.required]],
    mobile: ['', [Validators.required]],
    status: ['active', [Validators.required]],
    image_url: ['']
  });

  activeCount = signal(0);
  busyCount = signal(0);

  currentPage = signal(1);
  pageSize = 5;

  // Image Cropper State
  imageChangedEvent = signal<Event | null>(null);
  croppedImage = signal<string>('');
  showCropper = signal(false);

  paginatedDrivers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDrivers().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredDrivers().length / this.pageSize));

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(v => v + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(v => v - 1);
    }
  }

  ngOnInit() {
    this.loadDrivers();
  }

  loadDrivers() {
    this.api.getDeliveryTeam().subscribe({
      next: (d) => {
        this.drivers.set(d);
        this.applyFilter();
        this.updateStats();
      },
      error: () => this.toast.error('Failed to load delivery team')
    });
  }

  updateStats() {
    const all = this.drivers();
    this.activeCount.set(all.filter(d => d.status === 'active').length);
    this.busyCount.set(all.filter(d => d.status === 'busy').length);
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredDrivers.set(this.drivers());
      return;
    }
    this.filteredDrivers.set(
      this.drivers().filter(d => 
        d.name.toLowerCase().includes(term) || 
        d.mobile.includes(term) ||
        d.id?.toString().includes(term)
      )
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'busy': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'offline': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  openModal(driver?: DeliveryPerson) {
    this.imageChangedEvent.set(null);
    this.croppedImage.set('');
    this.showCropper.set(false);
    
    if (driver) {
      this.editingDriver.set(driver);
      this.driverForm.patchValue({
        name: driver.name,
        mobile: driver.mobile,
        status: driver.status,
        image_url: driver.image_url || ''
      });
      if (driver.image_url) {
        this.croppedImage.set(driver.image_url);
      }
    } else {
      this.editingDriver.set(null);
      this.driverForm.reset({ status: 'active', image_url: '' });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingDriver.set(null);
    this.driverForm.reset();
    this.imageChangedEvent.set(null);
    this.croppedImage.set('');
    this.showCropper.set(false);
  }

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent.set(event);
    this.showCropper.set(true);
  }

  imageCropped(event: ImageCroppedEvent) {
    if (event.objectUrl) {
      // For ngx-image-cropper v8+, objectUrl is preferred, but we need base64 to save
      // Let's use base64 if available, else we might need to fetch it
      this.croppedImage.set(event.base64 || event.objectUrl);
      this.driverForm.patchValue({ image_url: event.base64 || event.objectUrl });
    } else if (event.base64) {
      this.croppedImage.set(event.base64);
      this.driverForm.patchValue({ image_url: event.base64 });
    }
  }

  imageLoaded() {
    // show cropper
  }

  cropperReady() {
    // cropper ready
  }

  loadImageFailed() {
    this.toast.error('Failed to load image');
  }

  saveDriver() {
    if (this.driverForm.invalid) return;

    const driverData = this.driverForm.value as Partial<DeliveryPerson>;
    const editing = this.editingDriver();

    if (editing) {
      this.api.updateDeliveryPerson(editing.id!, driverData).subscribe({
        next: () => {
          this.toast.success('Driver updated successfully');
          this.loadDrivers();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to update driver')
      });
    } else {
      this.api.createDeliveryPerson(driverData).subscribe({
        next: () => {
          this.toast.success('Driver added successfully');
          this.loadDrivers();
          this.closeModal();
        },
        error: () => this.toast.error('Failed to add driver')
      });
    }
  }

  deleteDriver(driver: DeliveryPerson) {
    if (confirm(`Are you sure you want to remove ${driver.name}?`)) {
      this.api.deleteDeliveryPerson(driver.id!).subscribe({
        next: () => {
          this.toast.success('Driver removed successfully');
          this.loadDrivers();
        },
        error: () => this.toast.error('Failed to remove driver')
      });
    }
  }
}

