import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { CalculatorComponent } from '../../components/calculator/calculator';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, CalculatorComponent],
  templateUrl: './layout.html',
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout implements OnInit, OnDestroy {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  search = inject(SearchService);
  notificationService = inject(NotificationService);
  router = inject(Router);
  
  isMobileMenuOpen = signal(false);
  isDesktopCollapsed = signal(false);
  isNotificationsOpen = signal(false);
  
  private pollSub?: Subscription;

  ngOnInit() {
    this.fetchNotifications();
    // Poll for notifications every 30 seconds
    this.pollSub = interval(30000).subscribe(() => {
      this.fetchNotifications();
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  fetchNotifications() {
    if (this.auth.user()) {
      this.notificationService.fetchNotifications().subscribe();
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.search.setSearchTerm(input.value);
  }

  toggleDesktopSidebar() {
    this.isDesktopCollapsed.update(v => !v);
  }

  toggleNotifications() {
    this.isNotificationsOpen.update(v => !v);
  }

  handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
    this.isNotificationsOpen.set(false);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }
}
