import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './layout.html',
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  search = inject(SearchService);
  
  isMobileMenuOpen = signal(false);
  isDesktopCollapsed = signal(false);

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.search.setSearchTerm(input.value);
  }

  toggleDesktopSidebar() {
    this.isDesktopCollapsed.update(v => !v);
  }
}
