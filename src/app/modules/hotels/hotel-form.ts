import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CatalogService } from '../../services/catalog.service';
import { ToastService } from '../../services/toast.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { Hotel } from '../../models';

@Component({
  selector: 'app-hotel-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  templateUrl: './hotel-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelForm implements OnInit {
  catalog = inject(CatalogService);
  toast = inject(ToastService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  imageUpload = inject(ImageUploadService);

  isEditMode = signal(false);
  hotelId = signal<number | null>(null);
  isUploading = signal(false);
  
  hotel: Partial<Hotel> = {
    name: '',
    category: 'Indian',
    address: '',
    rating: 0,
    commission_rate: 10,
    image_url: 'https://picsum.photos/seed/restaurant/800/600',
    status: 'active'
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.hotelId.set(parseInt(id));
      const existingHotel = this.catalog.hotels().find(h => h.id === parseInt(id));
      if (existingHotel) {
        this.hotel = { ...existingHotel };
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading.set(true);
      this.imageUpload.uploadImage(file).subscribe({
        next: (url) => {
          if (url) {
            this.hotel.image_url = url;
            this.toast.success('Image uploaded successfully');
          } else {
            this.toast.error('Failed to upload image');
          }
          this.isUploading.set(false);
        },
        error: () => {
          this.toast.error('Failed to upload image');
          this.isUploading.set(false);
        }
      });
    }
  }

  saveHotel() {
    if (!this.hotel.name) {
      this.toast.error('Please enter a restaurant name');
      return;
    }
    
    if ((this.hotel.rating ?? 0) < 0 || (this.hotel.rating ?? 0) > 5) {
      this.toast.error('Rating must be between 0 and 5');
      return;
    }
    
    if (this.isEditMode() && this.hotelId()) {
      this.catalog.updateHotel(this.hotelId()!, this.hotel);
    } else {
      this.catalog.addHotel(this.hotel);
    }
    
    this.router.navigate(['/app/hotels']);
  }
}
