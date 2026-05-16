/// An AI companion the user can pick for a story.
class Partner {
  Partner({
    required this.id,
    required this.name,
    required this.language,
    required this.personaPrompt,
    this.spriteSetRef,
    this.voiceId,
  });

  final String id;
  final String name;
  final String language;
  final String personaPrompt;
  final String? spriteSetRef;
  final String? voiceId;

  factory Partner.fromJson(Map<String, dynamic> json) => Partner(
        id: json['id'] as String,
        name: json['name'] as String,
        language: json['language'] as String,
        personaPrompt: json['persona_prompt'] as String,
        spriteSetRef: json['sprite_set_ref'] as String?,
        voiceId: json['voice_id'] as String?,
      );
}
