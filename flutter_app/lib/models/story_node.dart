/// One node of a node-based story. `target` is the language being learned;
/// `translation` is the learner's-language rendering. Matches the backend
/// node format (`target` / `native`).
sealed class StoryNode {
  const StoryNode();

  factory StoryNode.fromJson(Map<String, dynamic> json) {
    switch (json['type'] as String?) {
      case 'dialogue':
        return DialogueNode(
          speaker: (json['speaker'] ?? '') as String,
          target: (json['target'] ?? '') as String,
          reading: (json['reading'] ?? '') as String,
          translation: (json['native'] ?? '') as String,
        );
      case 'quiz':
        return QuizNode(
          prompt: (json['prompt'] ?? '') as String,
          options: ((json['options'] as List?) ?? const [])
              .map((e) => e as String)
              .toList(),
          correctIndex: (json['correct_index'] ?? 0) as int,
          explanation: (json['explanation'] ?? '') as String,
        );
      default:
        return NarrationNode(
          target: (json['target'] ?? '') as String,
          translation: (json['native'] ?? '') as String,
        );
    }
  }
}

class NarrationNode extends StoryNode {
  const NarrationNode({required this.target, required this.translation});

  final String target;
  final String translation;
}

class DialogueNode extends StoryNode {
  const DialogueNode({
    required this.speaker,
    required this.target,
    required this.reading,
    required this.translation,
  });

  final String speaker;
  final String target;
  final String reading;
  final String translation;
}

class QuizNode extends StoryNode {
  const QuizNode({
    required this.prompt,
    required this.options,
    required this.correctIndex,
    required this.explanation,
  });

  final String prompt;
  final List<String> options;
  final int correctIndex;
  final String explanation;
}
