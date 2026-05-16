import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/chapter.dart';
import '../models/chapter_scene.dart';
import '../models/curriculum.dart';
import '../models/exercise.dart';
import '../models/partner.dart';
import '../models/story.dart';
import '../models/word_entry.dart';

/// Thrown when a backend request fails.
class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// REST client for the LingoDarling backend. Every call is authenticated with
/// the current Supabase session token.
class Api {
  static Map<String, String> get _headers {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<List<Partner>> listPartners() async {
    final res = await http.get(
      Uri.parse('${Config.apiUrl}/partners'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not load partners (${res.statusCode})');
    }
    return (jsonDecode(res.body) as List)
        .map((e) => Partner.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<Story>> listStories() async {
    final res = await http.get(
      Uri.parse('${Config.apiUrl}/stories'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not load stories (${res.statusCode})');
    }
    return (jsonDecode(res.body) as List)
        .map((e) => Story.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch one story together with its chapters.
  static Future<(Story, List<Chapter>)> getStory(String storyId) async {
    final res = await http.get(
      Uri.parse('${Config.apiUrl}/stories/$storyId'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not load story (${res.statusCode})');
    }
    return _parseStoryWithChapters(res.body);
  }

  /// Create a story from the user's customization choices. The backend runs
  /// AI outline generation, so this call can take several seconds.
  static Future<(Story, List<Chapter>)> createStory({
    required String partnerId,
    required String genre,
    required String tone,
    required String setting,
    required String premise,
    required String language,
    required String level,
    required int totalChapters,
  }) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/stories'),
      headers: _headers,
      body: jsonEncode({
        'partner_id': partnerId,
        'genre': genre,
        'tone': tone,
        'setting': setting,
        'premise': premise,
        'language': language,
        'level': level,
        'total_chapters': totalChapters,
      }),
    );
    if (res.statusCode != 200) {
      throw ApiException('Story creation failed (${res.statusCode})');
    }
    return _parseStoryWithChapters(res.body);
  }

  static (Story, List<Chapter>) _parseStoryWithChapters(String body) {
    final data = jsonDecode(body) as Map<String, dynamic>;
    final story = Story.fromJson(data['story'] as Map<String, dynamic>);
    final chapters = (data['chapters'] as List)
        .map((e) => Chapter.fromJson(e as Map<String, dynamic>))
        .toList();
    return (story, chapters);
  }

  /// Begin (or resume) a chapter: generates its opening scene and opens the
  /// chapter conversation. Can take several seconds (AI generation).
  static Future<ChapterStart> startChapter(String chapterId) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/chapters/$chapterId/start'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not start chapter (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ChapterStart(
      scene: ChapterScene.fromJson(data['scene'] as Map<String, dynamic>),
      conversationId: data['conversation_id'] as String,
      partnerName: data['partner_name'] as String,
      chapter: Chapter.fromJson(data['chapter'] as Map<String, dynamic>),
    );
  }

  /// Finish a chapter: produces a summary + vocab recap and unlocks the next.
  static Future<ChapterWrapup> completeChapter(String chapterId) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/chapters/$chapterId/complete'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not finish chapter (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ChapterWrapup(
      summary: data['summary'] as String,
      vocabPracticed:
          (data['vocab_practiced'] as List).map((e) => e as String).toList(),
      nextChapterId: data['next_chapter_id'] as String?,
      storyCompleted: data['story_completed'] as bool,
    );
  }

  /// Break a sentence into words with readings and short meanings.
  static Future<List<WordEntry>> lookupSentence(
    String text,
    String language,
  ) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/lookup'),
      headers: _headers,
      body: jsonEncode({'text': text, 'language': language}),
    );
    if (res.statusCode != 200) {
      throw ApiException('Lookup failed (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['words'] as List)
        .map((e) => WordEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Suggest a few things the learner could say next (beginner aid).
  static Future<List<ReplySuggestion>> getSuggestions(String chapterId) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/chapters/$chapterId/suggestions'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not get suggestions (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['suggestions'] as List)
        .map((e) => ReplySuggestion.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch the structured curriculum for a language + level. The backend
  /// generates it on first request, so this call can take ~15s the first time.
  static Future<List<CurriculumUnit>> getCurriculum(
    String language,
    String level,
  ) async {
    final res = await http.get(
      Uri.parse('${Config.apiUrl}/curriculum?language=$language&level=$level'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not load curriculum (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['units'] as List)
        .map((e) => CurriculumUnit.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Begin a lesson — generates its exercises on first use (can take ~15s).
  static Future<List<Exercise>> startLesson(String lessonId) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/lessons/$lessonId/start'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw ApiException('Could not start lesson (${res.statusCode})');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return (data['exercises'] as List)
        .map((e) => Exercise.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Grade one answer in a lesson.
  static Future<GradeResult> gradeExercise(
    String lessonId,
    int exerciseIndex,
    String userAnswer,
  ) async {
    final res = await http.post(
      Uri.parse('${Config.apiUrl}/lessons/$lessonId/grade'),
      headers: _headers,
      body: jsonEncode({
        'exercise_index': exerciseIndex,
        'user_answer': userAnswer,
      }),
    );
    if (res.statusCode != 200) {
      throw ApiException('Grading failed (${res.statusCode})');
    }
    return GradeResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }
}

/// Result of starting a chapter.
class ChapterStart {
  ChapterStart({
    required this.scene,
    required this.conversationId,
    required this.partnerName,
    required this.chapter,
  });

  final ChapterScene scene;
  final String conversationId;
  final String partnerName;
  final Chapter chapter;
}

/// Result of completing a chapter.
class ChapterWrapup {
  ChapterWrapup({
    required this.summary,
    required this.vocabPracticed,
    required this.nextChapterId,
    required this.storyCompleted,
  });

  final String summary;
  final List<String> vocabPracticed;
  final String? nextChapterId;
  final bool storyCompleted;
}

/// A suggested reply for the learner (beginner aid).
class ReplySuggestion {
  ReplySuggestion({required this.text, required this.translation});

  final String text;
  final String translation;

  factory ReplySuggestion.fromJson(Map<String, dynamic> json) =>
      ReplySuggestion(
        text: json['text'] as String,
        translation: json['translation'] as String,
      );
}
