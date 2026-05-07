import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { TestDocument } from '../../models/quiz.models';
import { QuizDataService } from '../../services/quiz-data.service';

@Component({
  selector: 'app-subject-topics',
  imports: [RouterLink],
  template: `
    @if (!doc) {
      <p class="muted">{{ loading ? 'Loading…' : 'Subject not found.' }}</p>
    } @else {
      <nav class="crumb"><a routerLink="/">Subjects</a> / {{ doc.subject_name ?? slug }}</nav>
      <h1>{{ doc.subject_name ?? slug }}</h1>
      <p class="muted">
        {{ total }} questions · grouped by syllabus topic when present, otherwise PYQ year. Choose
        <strong>Practice</strong> (instant explanation) or <strong>Test</strong> (answers only at the end).
      </p>

      <ul class="topics">
        <li class="topic-row row-all">
          <div class="topic-info">
            <span class="name">Full paper (all)</span>
            <span class="count">{{ total }} Q</span>
          </div>
          <div class="topic-actions">
            <a
              [routerLink]="['/subject', slug, 'quiz', 'all']"
              [queryParams]="{ mode: 'practice' }"
              class="pill"
              >Practice</a
            >
            <a
              [routerLink]="['/subject', slug, 'quiz', 'all']"
              [queryParams]="{ mode: 'test' }"
              class="pill primary"
              >Test</a
            >
          </div>
        </li>
        @for (t of topics; track t.key) {
          <li class="topic-row">
            <div class="topic-info">
              <span class="name">{{ t.label }}</span>
              <span class="count">{{ t.count }} Q</span>
            </div>
            <div class="topic-actions">
              <a
                [routerLink]="['/subject', slug, 'quiz', t.key]"
                [queryParams]="{ mode: 'practice' }"
                class="pill"
                >Practice</a
              >
              <a [routerLink]="['/subject', slug, 'quiz', t.key]" [queryParams]="{ mode: 'test' }" class="pill primary"
                >Test</a
              >
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .crumb {
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }
    .crumb a {
      color: var(--muted);
      text-decoration: none;
    }
    .crumb a:hover {
      color: var(--accent);
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.35rem;
    }
    .muted {
      color: var(--muted);
      margin-bottom: 1.5rem;
    }
    .topics {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .topic-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      margin-bottom: 0.5rem;
      transition: border-color 0.12s ease;
    }
    .topic-row:hover {
      border-color: rgba(79, 70, 229, 0.35);
    }
    .row-all {
      font-weight: 600;
      border-color: rgba(79, 70, 229, 0.35);
    }
    .topic-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      flex: 1 1 160px;
    }
    .topic-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .pill {
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.38rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
      background: transparent;
      transition:
        border-color 0.12s ease,
        background 0.12s ease;
    }
    .pill:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .pill.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .pill.primary:hover {
      filter: brightness(1.05);
      color: #fff;
    }
    .count {
      color: var(--muted);
      font-size: 0.9rem;
      white-space: nowrap;
    }
  `
})
export class SubjectTopicsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly quizData = inject(QuizDataService);

  slug = '';
  doc?: TestDocument;
  topics = this.quizData.buildTopicSummaries({ questions: [] });
  total = 0;
  loading = true;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      if (!this.slug) return;
      this.loading = true;
      this.quizData.loadBySlug(this.slug).subscribe({
        next: (doc) => {
          this.doc = doc;
          if (doc) {
            this.topics = this.quizData.buildTopicSummaries(doc);
            this.total = doc.questions?.length ?? 0;
          }
          this.loading = false;
        },
        error: () => {
          this.doc = undefined;
          this.loading = false;
        }
      });
    });
  }
}
