import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      [class]="'animate-pulse bg-slate-200 dark:bg-slate-800 ' + className"
      [style.width]="width"
      [style.height]="height"
      [style.borderRadius]="radius"
    ></div>
  `,
  styles: [`
    :host { display: inline-block; width: 100%; }
  `]
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() radius = '0.25rem';
  @Input() className = '';
}
