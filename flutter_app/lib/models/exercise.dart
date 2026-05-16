/// One lesson exercise. Answers are kept server-side — the client only sees
/// the prompt and (for multiple-choice) the options.
class Exercise {
  Exercise({
    required this.index,
    required this.type,
    required this.prompt,
    required this.options,
  });

  final int index;

  /// "multiple_choice" or "translate".
  final String type;
  final String prompt;
  final List<String> options;

  bool get isMultipleChoice => type == 'multiple_choice';

  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        index: json['index'] as int,
        type: json['type'] as String,
        prompt: json['prompt'] as String,
        options: (json['options'] as List).map((e) => e as String).toList(),
      );
}

/// The result of grading one answer.
class GradeResult {
  GradeResult({
    required this.correct,
    required this.correctAnswer,
    required this.feedback,
  });

  final bool correct;
  final String correctAnswer;
  final String feedback;

  factory GradeResult.fromJson(Map<String, dynamic> json) => GradeResult(
        correct: json['correct'] as bool,
        correctAnswer: json['correct_answer'] as String,
        feedback: json['feedback'] as String,
      );
}
