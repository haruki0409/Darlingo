/// One word from a sentence breakdown — the word, a reading aid, and meaning.
class WordEntry {
  WordEntry({
    required this.word,
    required this.reading,
    required this.meaning,
  });

  final String word;
  final String reading;
  final String meaning;

  factory WordEntry.fromJson(Map<String, dynamic> json) => WordEntry(
        word: json['word'] as String,
        reading: json['reading'] as String,
        meaning: json['meaning'] as String,
      );
}
