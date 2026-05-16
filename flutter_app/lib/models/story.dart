/// A customized, AI-generated story the user plays chapter by chapter.
class Story {
  Story({
    required this.id,
    required this.partnerId,
    required this.title,
    required this.premise,
    required this.settingOverview,
    required this.genre,
    required this.tone,
    required this.language,
    required this.level,
    required this.totalChapters,
    required this.currentChapterIdx,
    required this.status,
  });

  final String id;
  final String partnerId;
  final String title;
  final String premise;
  final String settingOverview;
  final String genre;
  final String tone;
  final String language;
  final String level;
  final int totalChapters;
  final int currentChapterIdx;
  final String status;

  factory Story.fromJson(Map<String, dynamic> json) => Story(
        id: json['id'] as String,
        partnerId: json['partner_id'] as String,
        title: json['title'] as String,
        premise: json['premise'] as String,
        settingOverview: json['setting_overview'] as String,
        genre: json['genre'] as String,
        tone: json['tone'] as String,
        language: json['language'] as String,
        level: json['level'] as String,
        totalChapters: json['total_chapters'] as int,
        currentChapterIdx: json['current_chapter_idx'] as int,
        status: json['status'] as String,
      );
}
