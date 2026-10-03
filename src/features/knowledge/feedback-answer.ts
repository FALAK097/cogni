const MAX_QUESTION_LENGTH = 5_000;
const MAX_ANSWER_LENGTH = 50_000;
const MAX_TITLE_LENGTH = 120;

export function buildVerifiedAnswerTitle(question: string) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) return "Verified customer answer";
  return `Answer: ${normalizedQuestion}`.slice(0, MAX_TITLE_LENGTH);
}

export function buildVerifiedAnswerSource(question: string, answer: string) {
  const normalizedQuestion = question.trim();
  const normalizedAnswer = answer.trim();

  if (!normalizedQuestion) throw new Error("The customer question is empty.");
  if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
    throw new Error("This question is too long to add as a knowledge source.");
  }
  if (!normalizedAnswer) throw new Error("Write a verified answer before adding it.");
  if (normalizedAnswer.length > MAX_ANSWER_LENGTH) {
    throw new Error("Keep the answer under 50,000 characters.");
  }

  return {
    title: buildVerifiedAnswerTitle(normalizedQuestion),
    content: `Question: ${normalizedQuestion}\n\nAnswer: ${normalizedAnswer}`,
  };
}
