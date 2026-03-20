export interface QuestionOption {
  label: string;
  content: string;
}

export interface ExamAnswer {
  questionId: number;
  userAnswer: string[];
  isCorrect: boolean;
  score: number;
}

export interface RandomPaperConfig {
  rules: Array<{
    categoryId: number;
    type: string;
    count: number;
    scorePerQuestion: number;
  }>;
}
