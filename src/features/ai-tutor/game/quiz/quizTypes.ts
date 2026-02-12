export interface QuizQuestion {
  text: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export type ChoiceType = "speed" | "jump" | "jumpCount" | "score" | "hpRestore" | "hpDecay";
