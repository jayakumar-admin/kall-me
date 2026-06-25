import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { CalculatorComponent } from '../../components/calculator/calculator';
import { Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  elementRef = inject(ElementRef);
  
  isMobileMenuOpen = signal(false);
  isDesktopCollapsed = signal(false);
  isNotificationsOpen = signal(false);
  
  private pollSub?: Subscription;
  private routerSub?: Subscription;

  ngOnInit() {
    this.fetchNotifications();
    // Poll for notifications every 30 seconds
    this.pollSub = interval(30000).subscribe(() => {
      this.fetchNotifications();
    });

    // Close sidebar on navigation
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeSidebar();
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const sidebar = this.elementRef.nativeElement.querySelector('aside');
    const menuToggle = this.elementRef.nativeElement.querySelector('.mobile-menu-toggle-btn');
    const desktopToggle = this.elementRef.nativeElement.querySelector('.desktop-menu-toggle-btn');

    if (sidebar && !sidebar.contains(target)) {
      // If click is outside sidebar
      if (menuToggle && menuToggle.contains(target)) {
        return; // Let the toggle button handle it
      }
      if (desktopToggle && desktopToggle.contains(target)) {
        return;
      }
      this.closeSidebar();
    }
  }

  closeSidebar() {
    if (this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
    if (!this.isDesktopCollapsed()) {
      this.isDesktopCollapsed.set(true);
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
