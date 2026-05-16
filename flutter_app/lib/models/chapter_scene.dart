/// The AI-generated opening of a chapter: narration, the partner's first line,
/// their emotion, and a hint about the chapter objective.
class ChapterScene {
  ChapterScene({
    required this.openingNarration,
    required this.partnerOpeningLine,
    required this.partnerOpeningLineEn,
    required this.partnerEmotion,
    required this.objectiveHint,
  });

  final String openingNarration;
  final String partnerOpeningLine;
  final String partnerOpeningLineEn;
  final String partnerEmotion;
  final String objectiveHint;

  factory ChapterScene.fromJson(Map<String, dynamic> json) => ChapterScene(
        openingNarration: json['opening_narration'] as String,
        partnerOpeningLine: json['partner_opening_line'] as String,
        partnerOpeningLineEn: json['partner_opening_line_en'] as String,
        partnerEmotion: json['partner_emotion'] as String,
        objectiveHint: json['objective_hint'] as String,
      );
}
