import { DecimalPipe, NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import type { PreparedMcq } from '../../models/quiz.models';
import { QuizDataService } from '../../services/quiz-data.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

type Phase = 'taking' | 'review';
type QuizMode = 'test' | 'practice';

@Component({
  selector: 'app-quiz',
  imports: [RouterLink, FormsModule, SafeHtmlPipe, DecimalPipe, NgClass],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.scss'
})
export class QuizComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly quizData = inject(QuizDataService);

  slug = '';
  topicRaw = '';
  subjectTitle = '';
  mode: QuizMode = 'test';

  phase: Phase = 'taking';
  questions: PreparedMcq[] = [];
  loading = true;
  index = 0;

  answers: Record<string, string | null> = {};
  /** Practice: user submitted this question and can see answer + explanation */
  practiceRevealed: Record<string, boolean> = {};

  /** After submit review */
  correctCount = 0;
  incorrectCount = 0;
  unattemptedCount = 0;
  gained = 0;
  lost = 0;

  expOpen: Record<string, boolean> = {};

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([p, qp]) => {
      const nextSlug = p.get('slug') ?? '';
      const nextTopic = p.get('topicKey') ?? '';
      const nextMode: QuizMode =
        (qp.get('mode') ?? 'test').toLowerCase() === 'practice' ? 'practice' : 'test';

      const slugTopicChanged = nextSlug !== this.slug || nextTopic !== this.topicRaw;
      const modeChanged = nextMode !== this.mode;

      this.slug = nextSlug;
      this.topicRaw = nextTopic;
      this.mode = nextMode;

      if (slugTopicChanged) {
        this.resetSession();
        this.load();
      } else if (modeChanged && this.questions.length) {
        this.resetAnswerStateOnly();
      }
    });
  }

  get isPractice(): boolean {
    return this.mode === 'practice';
  }

  private resetSession(): void {
    this.phase = 'taking';
    this.index = 0;
    this.answers = {};
    this.practiceRevealed = {};
    this.expOpen = {};
  }

  /** Same questions; user switched practice ↔ test in the URL */
  private resetAnswerStateOnly(): void {
    this.phase = 'taking';
    this.index = 0;
    this.expOpen = {};
    for (const q of this.questions) {
      this.answers[q.id] = null;
      this.practiceRevealed[q.id] = false;
    }
  }

  get current(): PreparedMcq | undefined {
    return this.questions[this.index];
  }

  get answeredCount(): number {
    return Object.values(this.answers).filter(Boolean).length;
  }

  get practiceCheckedCount(): number {
    return this.questions.filter((q) => this.practiceRevealed[q.id]).length;
  }

  get progress(): number {
    if (!this.questions.length) return 0;
    return Math.round(((this.index + 1) / this.questions.length) * 100);
  }

  load(): void {
    this.loading = true;
    this.questions = [];
    this.quizData.loadBySlug(this.slug).subscribe({
      next: (doc) => {
        if (!doc) {
          this.loading = false;
          return;
        }
        this.subjectTitle = doc.subject_name ?? this.slug;
        const all = this.topicRaw === 'all';
        const label = all ? '' : decodeURIComponent(this.topicRaw);
        this.questions = all
          ? this.quizData.getAllPrepared(doc)
          : this.quizData.getQuestionsForTopic(doc, label);
        for (const q of this.questions) {
          this.answers[q.id] = null;
          this.practiceRevealed[q.id] = false;
        }
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  pick(id: string, key: string): void {
    if (this.isPractice && this.practiceRevealed[id]) return;
    this.answers[id] = key;
  }

  practiceSubmitCurrent(): void {
    const q = this.current;
    if (!q || this.practiceRevealed[q.id]) return;
    if (!this.answers[q.id]) return;
    this.practiceRevealed[q.id] = true;
  }

  practiceRevealBlocked(): boolean {
    const q = this.current;
    if (!q) return true;
    return !this.answers[q.id];
  }

  dotFilled(q: PreparedMcq): boolean {
    if (this.isPractice) return !!this.practiceRevealed[q.id];
    return !!this.answers[q.id];
  }

  optClass(q: PreparedMcq, key: string): Record<string, boolean> {
    if (!this.isPractice || !this.practiceRevealed[q.id]) {
      return { picked: this.answers[q.id] === key };
    }
    const picked = this.answers[q.id] === key;
    const isAns = q.answerKey === key;
    return {
      'reveal-correct': isAns,
      'reveal-wrong': picked && !isAns
    };
  }

  prev(): void {
    this.index = Math.max(0, this.index - 1);
  }

  next(): void {
    this.index = Math.min(this.questions.length - 1, this.index + 1);
  }

  jump(i: number): void {
    this.index = Math.max(0, Math.min(this.questions.length - 1, i));
  }

  finish(): void {
    let g = 0;
    let l = 0;
    let c = 0;
    let ic = 0;
    let u = 0;
    for (const q of this.questions) {
      const sel = this.answers[q.id];
      if (!sel) {
        u++;
        continue;
      }
      if (sel === q.answerKey) {
        c++;
        g += q.marks;
      } else {
        ic++;
        l += q.negativeMarks;
      }
    }
    this.correctCount = c;
    this.incorrectCount = ic;
    this.unattemptedCount = u;
    this.gained = g;
    this.lost = l;
    this.phase = 'review';
  }

  toggleExp(id: string): void {
    this.expOpen[id] = !this.expOpen[id];
  }

  headline(): string {
    if (this.topicRaw === 'all') return 'Full paper';
    return decodeURIComponent(this.topicRaw);
  }

  scoreNet(): number {
    return +(this.gained - this.lost).toFixed(2);
  }

  retry(): void {
    this.phase = 'taking';
    this.index = 0;
    this.expOpen = {};
    const next: Record<string, string | null> = {};
    const rev: Record<string, boolean> = {};
    for (const q of this.questions) {
      next[q.id] = null;
      rev[q.id] = false;
    }
    this.answers = next;
    this.practiceRevealed = rev;
  }

  modeLabel(): string {
    return this.isPractice ? 'Practice' : 'Test';
  }
}
