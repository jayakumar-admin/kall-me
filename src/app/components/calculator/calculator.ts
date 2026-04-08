import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="relative">
      <button (click)="toggle()" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors" title="Calculator">
        <mat-icon>calculate</mat-icon>
      </button>

      @if (isOpen()) {
        <div class="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div class="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculator</span>
            <button (click)="close()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>
          
          <div class="p-4 space-y-4">
            <div class="bg-[#F8F9FA] dark:bg-[#0F172A] p-4 rounded-xl text-right">
              <div class="text-[10px] text-slate-400 h-4 truncate">{{ expression() }}</div>
              <div class="text-2xl font-black text-[#1A1A1A] dark:text-white truncate">{{ display() }}</div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <button (click)="clear()" class="col-span-2 btn-calc bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">AC</button>
              <button (click)="delete()" class="btn-calc bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <mat-icon class="text-sm">backspace</mat-icon>
              </button>
              <button (click)="appendOperator('/')" class="btn-calc bg-[#FFC107]/10 text-[#FFC107]">÷</button>

              <button (click)="appendNumber('7')" class="btn-calc">7</button>
              <button (click)="appendNumber('8')" class="btn-calc">8</button>
              <button (click)="appendNumber('9')" class="btn-calc">9</button>
              <button (click)="appendOperator('*')" class="btn-calc bg-[#FFC107]/10 text-[#FFC107]">×</button>

              <button (click)="appendNumber('4')" class="btn-calc">4</button>
              <button (click)="appendNumber('5')" class="btn-calc">5</button>
              <button (click)="appendNumber('6')" class="btn-calc">6</button>
              <button (click)="appendOperator('-')" class="btn-calc bg-[#FFC107]/10 text-[#FFC107]">−</button>

              <button (click)="appendNumber('1')" class="btn-calc">1</button>
              <button (click)="appendNumber('2')" class="btn-calc">2</button>
              <button (click)="appendNumber('3')" class="btn-calc">3</button>
              <button (click)="appendOperator('+')" class="btn-calc bg-[#FFC107]/10 text-[#FFC107]">+</button>

              <button (click)="appendNumber('0')" class="col-span-2 btn-calc text-left px-6">0</button>
              <button (click)="appendNumber('.')" class="btn-calc">.</button>
              <button (click)="calculate()" class="btn-calc bg-[#FFC107] text-black font-black">=</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  // styles: [`
  //   .btn-calc {
  //     @apply h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-white/10 dark:text-white;
  //   }
  // `]
})
export class CalculatorComponent {
  isOpen = signal(false);
  display = signal('0');
  expression = signal('');
  private shouldReset = false;

  toggle() {
    this.isOpen.update(v => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  appendNumber(num: string) {
    if (this.shouldReset) {
      this.display.set(num);
      this.shouldReset = false;
    } else {
      const current = this.display();
      if (current === '0' && num !== '.') {
        this.display.set(num);
      } else {
        if (num === '.' && current.includes('.')) return;
        this.display.set(current + num);
      }
    }
  }

  appendOperator(op: string) {
    if (this.shouldReset) {
      this.expression.set(this.display() + ' ' + op + ' ');
      this.shouldReset = false;
    } else {
      this.expression.set(this.expression() + this.display() + ' ' + op + ' ');
      this.display.set('0');
    }
  }

  clear() {
    this.display.set('0');
    this.expression.set('');
    this.shouldReset = false;
  }

  delete() {
    const current = this.display();
    if (current.length > 1) {
      this.display.set(current.slice(0, -1));
    } else {
      this.display.set('0');
    }
  }

  calculate() {
    try {
      const fullExpression = this.expression() + this.display();
      // Use Function instead of eval for a bit more safety in this simple context
      const result = new Function(`return ${fullExpression}`)();
      this.expression.set(fullExpression + ' =');
      this.display.set(result.toString());
      this.shouldReset = true;
    } catch {
      this.display.set('Error');
      this.shouldReset = true;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.isOpen()) return;
    
    if (event.key >= '0' && event.key <= '9') this.appendNumber(event.key);
    if (event.key === '.') this.appendNumber('.');
    if (['+', '-', '*', '/'].includes(event.key)) this.appendOperator(event.key);
    if (event.key === 'Enter' || event.key === '=') this.calculate();
    if (event.key === 'Escape') this.close();
    if (event.key === 'Backspace') this.delete();
    if (event.key === 'Delete') this.clear();
  }
}
