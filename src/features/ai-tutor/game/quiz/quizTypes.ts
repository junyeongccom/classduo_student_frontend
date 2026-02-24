export interface QuizQuestion {
  text: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export type ActiveAbilityType = "magnet" | "giant" | "coinRain" | "multiJumpScore" | "skyTreasure";

export type ChoiceType =
  | "speed"
  | "jump"
  | "jumpCount"
  | "score"
  | "heartBoost"
  | "hpDecay"
  | ActiveAbilityType;
