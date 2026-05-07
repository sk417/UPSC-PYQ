import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SubjectManifestEntry, SubjectsManifest } from '../../models/quiz.models';
import { QuizDataService } from '../../services/quiz-data.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="hero">
      <h1>UPSC practice tests</h1>
      <p class="lede">
        Pick a subject, then a topic (or year bucket). Your <code>.txt</code> exports stay in
        <code>public/assets/subjects</code>—loaded locally in the browser.
      </p>
    </div>

    @if (error) {
      <p class="error">{{ error }}</p>
    } @else if (!manifest) {
      <p class="muted">Loading subjects…</p>
    } @else {
      <ul class="grid">
        @for (s of manifest.subjects; track s.slug) {
          <li>
            <a [routerLink]="['/subject', s.slug]" class="card">
              <span class="title">{{ titles[s.slug] || labelFromSlug(s) }}</span>
              @if (s.shortTitle) {
                <span class="muted small">{{ s.shortTitle }}</span>
              }
            </a>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .hero {
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 650;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem;
    }
    .lede {
      max-width: 42rem;
      color: var(--muted);
      margin: 0;
      line-height: 1.55;
    }
    .grid {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.1rem 1.15rem;
      border-radius: 12px;
      background: var(--card);
      border: 1px solid var(--border);
      color: inherit;
      text-decoration: none;
      min-height: 4.5rem;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }
    .card:hover {
      border-color: var(--accent);
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08);
    }
    .title {
      font-weight: 600;
    }
    .small {
      font-size: 0.85rem;
    }
    .muted {
      color: var(--muted);
    }
    .error {
      color: var(--danger);
    }
    code {
      font-size: 0.82em;
    }
  `
})
export class HomeComponent {
  private readonly quizData = inject(QuizDataService);

  manifest?: SubjectsManifest;
  titles: Record<string, string> = {};
  error = '';

  constructor() {
    this.quizData.getManifest().subscribe({
      next: (m) => {
        this.manifest = m;
        for (const s of m.subjects) this.hydrateTitle(s);
      },
      error: () => (this.error = 'Could not load subjects-manifest.json.')
    });
  }

  private hydrateTitle(entry: SubjectManifestEntry): void {
    this.quizData.loadTestDocument(entry).subscribe({
      next: (doc) => {
        if (doc.subject_name) this.titles[entry.slug] = doc.subject_name;
      },
      error: () => {}
    });
  }

  labelFromSlug(s: SubjectManifestEntry): string {
    return s.shortTitle ?? s.slug.replace(/-/g, ' ');
  }
}
