import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { SearchService } from '../../../services/search.service';
import { User } from '../../../services/auth.service';
import { ConfirmDialog } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, ConfirmDialog],
  template: `
    <div class="space-y-4 md:space-y-8">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">User Management</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Manage admin and staff accounts.</p>
        </div>
        <button (click)="openModal()" class="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <mat-icon>person_add</mat-icon>
          Add User
        </button>
      </div>

      <div class="card overflow-hidden p-0 border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div class="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative w-full sm:w-80">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchTerm() || search.searchTerm()" 
              (ngModelChange)="onSearchChange($event)"
              placeholder="Search user name, email, role..." 
              class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs outline-none focus:ring-1 focus:ring-[#FFC107] dark:text-white"
            >
            @if (effectiveSearchTerm()) {
              <button (click)="clearSearch()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            }
          </div>
          <span class="text-xs text-slate-400 font-bold">
            {{ filteredUsers().length }} / {{ users().length }} users
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th class="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th class="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              @for (user of filteredUsers(); track user.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td class="px-4 md:px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FFC107]/10 flex items-center justify-center text-[#FFC107] font-bold text-sm">
                        {{ user.name.charAt(0) }}
                      </div>
                      <div>
                        <p class="font-bold text-sm md:text-base text-[#1A1A1A] dark:text-white">{{ user.name }}</p>
                        <p class="text-[10px] md:text-xs text-slate-500">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="hidden md:table-cell px-6 py-4">
                    <p class="text-sm text-slate-600 dark:text-slate-400">{{ user.mobile || 'N/A' }}</p>
                  </td>
                  <td class="px-4 md:px-6 py-4">
                    <span class="px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest"
                      [ngClass]="user.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="px-4 md:px-6 py-4 text-right">
                    <button (click)="deleteUser(user)" class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                    <mat-icon class="text-4xl mb-2 opacity-40">{{ effectiveSearchTerm() ? 'search_off' : 'people' }}</mat-icon>
                    <p class="text-sm font-medium">
                      {{ effectiveSearchTerm() ? 'No users found matching "' + effectiveSearchTerm() + '"' : 'No users registered yet.' }}
                    </p>
                    @if (effectiveSearchTerm()) {
                      <button (click)="clearSearch()" class="mt-2 text-xs text-[#FFC107] font-bold hover:underline">Clear search</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add User Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div class="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 class="text-xl font-display font-black text-[#1A1A1A] dark:text-white uppercase tracking-tight">Add New User</h3>
              <button (click)="closeModal()" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="p-6 space-y-4">
              <div>
                <label for="userName" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Full Name</label>
                <input id="userName" type="text" formControlName="name" class="input-field" placeholder="Enter name">
              </div>
              
              <div>
                <label for="userEmail" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Email Address</label>
                <input id="userEmail" type="email" formControlName="email" class="input-field" placeholder="Enter email">
              </div>

              <div>
                <label for="userMobile" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Mobile Number</label>
                <input id="userMobile" type="text" formControlName="mobile" class="input-field" placeholder="Enter mobile">
              </div>
              
              <div>
                <label for="userRole" class="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Role</label>
                <select id="userRole" formControlName="role" class="input-field">
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div class="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/10">
                <p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-1">Note</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">A 6-character password will be auto-generated and sent to the user via WhatsApp.</p>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" (click)="closeModal()" class="flex-1 px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold transition-all">Cancel</button>
                <button type="submit" [disabled]="userForm.invalid" class="flex-1 btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>

    @if (showDeleteConfirm()) {
      <app-confirm-dialog
        [title]="'Remove User'"
        [message]="'Are you sure you want to remove ' + userToDelete()?.name + '?'"
        (confirmed)="confirmDelete()"
        (cancelled)="showDeleteConfirm.set(false)">
      </app-confirm-dialog>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagement implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  search = inject(SearchService);

  users = signal<User[]>([]);
  searchTerm = signal('');

  effectiveSearchTerm = computed(() => (this.searchTerm() || this.search.searchTerm() || '').toLowerCase().trim());

  filteredUsers = computed(() => {
    const term = this.effectiveSearchTerm();
    const all = this.users();
    if (!term) return all;
    return all.filter(u => 
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.mobile && u.mobile.includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.search.setSearchTerm(term);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.search.clearSearch();
  }

  showModal = signal(false);
  showDeleteConfirm = signal(false);
  userToDelete = signal<User | null>(null);

  userForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required]],
    role: ['admin', [Validators.required]]
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.getUsers().subscribe({
      next: (u) => this.users.set(u),
      error: () => this.toast.error('Failed to load users')
    });
  }

  openModal() {
    this.userForm.reset({ role: 'admin' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveUser() {
    if (this.userForm.invalid) return;

    const userData = {
      name: this.userForm.value.name as string,
      email: this.userForm.value.email as string,
      mobile: this.userForm.value.mobile as string,
      role: this.userForm.value.role as 'admin' | 'delivery' | 'staff'
    };

    this.api.registerUser(userData).subscribe({
      next: () => {
        this.toast.success('User created successfully. Account details sent via WhatsApp.');
        this.loadUsers();
        this.closeModal();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to create user');
      }
    });
  }

  deleteUser(user: User) {
    this.userToDelete.set(user);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete() {
    const user = this.userToDelete();
    if (!user) return;

    this.api.deleteUser(user.id as number).subscribe({
      next: () => {
        this.toast.success('User removed successfully');
        this.loadUsers();
        this.showDeleteConfirm.set(false);
      },
      error: () => {
        this.toast.error('Failed to remove user');
        this.showDeleteConfirm.set(false);
      }
    });
  }
}
