/// A node-based story (the pivoted Story Mode). Pre-made stories are curated;
/// custom stories are created by the user from a premise.
class NodeStory {
  NodeStory({
    required this.id,
    required this.title,
    required this.premise,
    required this.language,
    required this.level,
    required this.isPremade,
  });

  final String id;
  final String title;
  final String premise;
  final String language; // "ja" or "ko"
  final String level;
  final bool isPremade;

  factory NodeStory.fromJson(Map<String, dynamic> json) => NodeStory(
        id: json['id'] as String,
        title: json['title'] as String,
        premise: json['premise'] as String,
        language: json['language'] as String,
        level: json['level'] as String,
        isPremade: json['is_premade'] as bool,
      );
}
