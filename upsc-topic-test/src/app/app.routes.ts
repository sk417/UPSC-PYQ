import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SubjectTopicsComponent } from './pages/subject-topics/subject-topics.component';
import { QuizComponent } from './pages/quiz/quiz.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'subject/:slug', component: SubjectTopicsComponent },
  { path: 'subject/:slug/quiz/:topicKey', component: QuizComponent },
  { path: '**', redirectTo: '' }
];
