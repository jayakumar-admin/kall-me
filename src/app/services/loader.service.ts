import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private isLoading = signal(false);
  private loadingMessage = signal('Delivering Happiness...');

  loading = this.isLoading.asReadonly();
  message = this.loadingMessage.asReadonly();

  show(msg?: string) {
    if (msg) this.loadingMessage.set(msg);
    this.isLoading.set(true);
  }

  hide() {
    this.isLoading.set(false);
    // Reset message after a small delay to avoid flickering
    setTimeout(() => this.loadingMessage.set('Delivering Happiness...'), 300);
  }
}
