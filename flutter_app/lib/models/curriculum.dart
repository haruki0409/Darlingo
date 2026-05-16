/// One vocabulary or grammar item a lesson teaches.
class TargetItem {
  TargetItem({
    required this.term,
    required this.reading,
    required this.meaning,
    required this.kind,
  });

  final String term;
  final String reading;
  final String meaning;

  /// "vocab" or "grammar".
  final String kind;

  factory TargetItem.fromJson(Map<String, dynamic> json) => TargetItem(
        term: json['term'] as String,
        reading: json['reading'] as String,
        meaning: json['meaning'] as String,
        kind: json['kind'] as String,
      );
}

/// A lesson within a curriculum unit.
class CurriculumLesson {
  CurriculumLesson({
    required this.id,
    required this.idx,
    required this.title,
    required this.focus,
    required this.targetItems,
    required this.hasExercises,
  });

  final String id;
  final int idx;
  final String title;
  final String focus;
  final List<TargetItem> targetItems;
  final bool hasExercises;

  factory CurriculumLesson.fromJson(Map<String, dynamic> json) =>
      CurriculumLesson(
        id: json['id'] as String,
        idx: json['idx'] as int,
        title: json['title'] as String,
        focus: json['focus'] as String,
        targetItems: (json['target_items'] as List)
            .map((e) => TargetItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        hasExercises: json['has_exercises'] as bool,
      );
}

/// A themed unit of the curriculum, containing lessons.
class CurriculumUnit {
  CurriculumUnit({
    required this.id,
    required this.idx,
    required this.title,
    required this.description,
    required this.lessons,
  });

  final String id;
  final int idx;
  final String title;
  final String description;
  final List<CurriculumLesson> lessons;

  factory CurriculumUnit.fromJson(Map<String, dynamic> json) => CurriculumUnit(
        id: json['id'] as String,
        idx: json['idx'] as int,
        title: json['title'] as String,
        description: json['description'] as String,
        lessons: (json['lessons'] as List)
            .map((e) => CurriculumLesson.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
