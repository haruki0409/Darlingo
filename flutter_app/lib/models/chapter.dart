/// One chapter of a story. Outline fields come from AI generation; `scene`
/// content and progress are added when the chapter is played (Milestone 2B).
class Chapter {
  Chapter({
    required this.id,
    required this.idx,
    required this.title,
    required this.premise,
    required this.settingTag,
    required this.objective,
    required this.targetVocab,
    required this.targetGrammar,
    required this.status,
  });

  final String id;
  final int idx;
  final String title;
  final String premise;
  final String settingTag;
  final String objective;
  final List<String> targetVocab;
  final List<String> targetGrammar;

  /// locked | available | in_progress | completed
  final String status;

  bool get isLocked => status == 'locked';
  bool get isCompleted => status == 'completed';

  factory Chapter.fromJson(Map<String, dynamic> json) => Chapter(
        id: json['id'] as String,
        idx: json['idx'] as int,
        title: json['title'] as String,
        premise: json['premise'] as String,
        settingTag: json['setting_tag'] as String,
        objective: json['objective'] as String,
        targetVocab:
            (json['target_vocab'] as List).map((e) => e as String).toList(),
        targetGrammar:
            (json['target_grammar'] as List).map((e) => e as String).toList(),
        status: json['status'] as String,
      );
}
