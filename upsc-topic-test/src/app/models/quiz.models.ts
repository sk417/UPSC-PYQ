export interface SubjectManifestEntry {
  slug: string;
  file: string;
  shortTitle?: string;
}

export interface SubjectsManifest {
  subjects: SubjectManifestEntry[];
}

export interface QuizSinglePayload {
  question: string;
  formatted_question?: string;
  answer: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  pyq_year?: string;
  marks?: number;
  negative_marks?: number;
  answer_explanation?: string;
  formatted_answer_explanation?: string;
}

export interface QuizApiQuestion {
  question_id: string;
  question_type: string;
  subject_name?: string;
  topic_name?: string;
  subtopic_name?: string;
  category?: string;
  single?: QuizSinglePayload;
}

export interface TestDocument {
  subject_name?: string;
  questions: QuizApiQuestion[];
}

export interface PreparedMcq {
  id: string;
  topicLabel: string;
  questionHtml: string;
  options: { key: string; text: string }[];
  answerKey: string;
  explanationHtml: string;
  marks: number;
  negativeMarks: number;
}

export interface TopicSummary {
  key: string;
  label: string;
  count: number;
}
