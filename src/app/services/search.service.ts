
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  searchTerm = signal<string>('');

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }
}
