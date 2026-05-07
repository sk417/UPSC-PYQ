import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import type {
  PreparedMcq,
  QuizApiQuestion,
  SubjectManifestEntry,
  SubjectsManifest,
  TestDocument,
  TopicSummary
} from '../models/quiz.models';

@Injectable({
  providedIn: 'root'
})
export class QuizDataService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly baseUrl = new URL('assets/subjects', this.document.baseURI)
    .toString()
    .replace(/\/$/, '');

  private manifest$?: Observable<SubjectsManifest>;

  getManifest(): Observable<SubjectsManifest> {
    if (!this.manifest$) {
      this.manifest$ = this.http
        .get<SubjectsManifest>(`${this.baseUrl}/subjects-manifest.json`)
        .pipe(shareReplay(1));
    }
    return this.manifest$;
  }

  getSubjectEntry(slug: string): Observable<SubjectManifestEntry | undefined> {
    return this.getManifest().pipe(
      map((m) => m.subjects.find((s) => s.slug === slug))
    );
  }

  loadTestDocument(entry: SubjectManifestEntry): Observable<TestDocument> {
    return this.http.get(`${this.baseUrl}/${entry.file}`, { responseType: 'text' }).pipe(
      map((raw) => JSON.parse(raw) as TestDocument)
    );
  }

  /** Preload document for slug; returns undefined if unknown slug. */
  loadBySlug(slug: string): Observable<TestDocument | undefined> {
    return this.getSubjectEntry(slug).pipe(
      switchMap((entry) => (entry ? this.loadTestDocument(entry) : of(undefined)))
    );
  }

  buildTopicSummaries(doc: TestDocument): TopicSummary[] {
    const map = new Map<string, number>();
    for (const q of doc.questions ?? []) {
      const label = this.topicLabel(q);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ key: encodeURIComponent(label), label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }

  getQuestionsForTopic(doc: TestDocument, topicLabel: string): PreparedMcq[] {
    const list = (doc.questions ?? []).filter((q) => this.topicLabel(q) === topicLabel);
    return list.map((q) => this.toPreparedMcq(q)).filter((p): p is PreparedMcq => p !== undefined);
  }

  getAllPrepared(doc: TestDocument): PreparedMcq[] {
    return (doc.questions ?? [])
      .map((q) => this.toPreparedMcq(q))
      .filter((p): p is PreparedMcq => p !== undefined);
  }

  topicLabel(q: QuizApiQuestion): string {
    const topic = (q.topic_name ?? '').trim();
    const sub = (q.subtopic_name ?? '').trim();
    if (topic && sub) return `${topic} › ${sub}`;
    if (topic) return topic;
    if (sub) return sub;
    const cat = (q.category ?? 'PYQ').trim() || 'PYQ';
    const year = q.single?.pyq_year?.trim();
    if (year) return `${cat} · ${year}`;
    return `${cat} · Mix`;
  }

  private toPreparedMcq(q: QuizApiQuestion): PreparedMcq | undefined {
    if (q.question_type !== 'SINGLE' || !q.single) return undefined;
    const s = q.single;
    const questionText = (s.formatted_question ?? s.question ?? '').trim();
    if (!questionText) return undefined;
    const opts: { key: string; text: string }[] = [];
    const parts: [string, string | undefined][] = [
      ['A', s.option_a],
      ['B', s.option_b],
      ['C', s.option_c],
      ['D', s.option_d]
    ];
    for (const [key, text] of parts) {
      if (text?.trim()) opts.push({ key, text: text.trim() });
    }
    const answer = (s.answer ?? '').trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(answer)) return undefined;

    const expl = (s.formatted_answer_explanation ?? s.answer_explanation ?? '').trim();

    return {
      id: q.question_id,
      topicLabel: this.topicLabel(q),
      questionHtml: this.basicFormatToSafeHtml(questionText),
      options: opts,
      answerKey: answer,
      explanationHtml: expl ? this.basicFormatToSafeHtml(expl) : '',
      marks: typeof s.marks === 'number' ? s.marks : 2,
      negativeMarks: typeof s.negative_marks === 'number' ? s.negative_marks : 0
    };
  }

  /** Escapes HTML then applies **bold** and newlines (offline study content). */
  basicFormatToSafeHtml(raw: string): string {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  }
}
