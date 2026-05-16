import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/story_node.dart';

/// One pre-made story available offline (no backend needed).
class PremadeStory {
  const PremadeStory({
    required this.id,
    required this.title,
    required this.premise,
    required this.language,
  });

  final String id;
  final String title;
  final String premise;
  final String language; // 'ja' | 'ko'

  /// Key into `assets/data/premade_nodes.json` (`{language}|{title}`).
  String get nodesKey => '$language|$title';
}

/// Same shape as the backend's `PREMADE_STORIES` so the two stay in sync;
/// nodes live separately in `assets/data/premade_nodes.json`.
const List<PremadeStory> kPremadeStories = [
  PremadeStory(
    id: 'ja-first-day-in-tokyo',
    title: 'First Day in Tokyo',
    premise:
        'A newcomer gets lost near Shinjuku station and is helped by a warm, '
        'cheerful local woman named Akari.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-the-cat-cafe',
    title: 'The Cat Cafe',
    premise:
        'Two strangers bond over the cats at a cozy Tokyo cat cafe on a rainy '
        'afternoon; the companion is a gentle woman named Yuki.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-cherry-blossom-picnic',
    title: 'Cherry Blossom Picnic',
    premise:
        'A spring hanami picnic in Ueno Park where the player grows close to '
        'a kind woman named Akari.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-summer-festival',
    title: 'Summer Festival',
    premise:
        'An evening at a summer matsuri — yukata, games, fireworks — and a '
        'chance meeting with a friendly, easygoing young man named Haruto.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-train-to-kyoto',
    title: 'Train to Kyoto',
    premise:
        'A long shinkansen ride where the player and a thoughtful woman named '
        'Sora share stories about their travels.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-the-bookshop-corner',
    title: 'The Bookshop Corner',
    premise:
        'A quiet used-bookshop where a recommendation from a calm, witty '
        'young man named Daiki sparks an unexpected friendship.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-konbini-midnight',
    title: 'Convenience Store at Midnight',
    premise:
        'A late-night konbini run leads to a small, warm conversation with '
        'the night-shift clerk, a friendly woman named Mei.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-cooking-class',
    title: 'The Cooking Class',
    premise:
        'A beginner cooking class where the player teams up with a cheerful '
        'woman named Hana to make a simple Japanese dish.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-rainy-umbrella',
    title: 'Rainy Day Umbrella',
    premise:
        'Sharing an umbrella in a sudden Tokyo downpour turns a commute into '
        'a meeting with a soft-spoken woman named Rin.',
    language: 'ja',
  ),
  PremadeStory(
    id: 'ja-beach-trip',
    title: 'The Beach Trip',
    premise:
        'A seaside day trip in Kamakura with a lively, sun-loving young man '
        'named Sota — swimming, snacks, and sunset talk.',
    language: 'ja',
  ),
  // --- Korean ---
  PremadeStory(
    id: 'ko-first-day-in-seoul',
    title: 'First Day in Seoul',
    premise:
        'A newcomer gets lost near Hongdae and is helped by a warm, bright '
        'local woman named Jiwoo.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-cat-cafe-seoul',
    title: 'The Cat Cafe in Seoul',
    premise:
        'Two strangers bond over the cats at a cozy cat cafe in Seoul on a '
        'rainy afternoon; the companion is a gentle woman named Yuna.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-cherry-blossom-walk',
    title: 'Cherry Blossom Walk',
    premise:
        'A spring walk among the cherry blossoms along the Han River where '
        'the player grows close to a kind woman named Soyeon.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-hangang-picnic',
    title: 'Hangang Picnic',
    premise:
        'A riverside picnic at Hangang Park with a friendly, easygoing young '
        'man named Minjun — chicken, mats, and city lights.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-night-market',
    title: 'The Night Market',
    premise:
        'An evening at Gwangjang Market — street food and lively stalls — '
        'and a chance meeting with a charming young man named Doyoon.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-bookcafe',
    title: 'The Bookcafe',
    premise:
        'A quiet book-cafe in Seongsu where a recommendation from a calm, '
        'witty woman named Hyejin sparks a friendship.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-konbini-midnight',
    title: 'Convenience Store at Midnight',
    premise:
        'A late-night convenience-store run leads to a warm conversation '
        'with the night-shift clerk, a friendly woman named Eunbi.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-pottery-class',
    title: 'The Pottery Class',
    premise:
        'A beginner pottery class in Insadong where the player teams up with '
        'a cheerful woman named Areum.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-rainy-insadong',
    title: 'Rainy Day in Insadong',
    premise:
        'Sharing an umbrella in a sudden downpour in Insadong turns a stroll '
        'into a meeting with a soft-spoken woman named Chaewon.',
    language: 'ko',
  ),
  PremadeStory(
    id: 'ko-namsan-sunset',
    title: 'Namsan Sunset',
    premise:
        'A walk up to Namsan Tower at golden hour with a lively, kind young '
        'man named Jihun — views, snacks, and easy talk.',
    language: 'ko',
  ),
];

Map<String, List<StoryNode>>? _cache;

/// Load every available pre-generated node sequence from the bundled JSON.
/// Stories without an entry are simply absent from the returned map.
Future<Map<String, List<StoryNode>>> loadPremadeNodes() async {
  if (_cache != null) return _cache!;
  final raw = await rootBundle.loadString('assets/data/premade_nodes.json');
  final decoded = jsonDecode(raw) as Map<String, dynamic>;
  _cache = decoded.map(
    (k, v) => MapEntry(
      k,
      (v as List)
          .map((n) => StoryNode.fromJson(n as Map<String, dynamic>))
          .toList(),
    ),
  );
  return _cache!;
}

/// Returns the cached nodes for a story, or `null` if no JSON entry exists yet
/// (e.g. the seed script hasn't generated this one).
Future<List<StoryNode>?> nodesFor(PremadeStory story) async {
  final all = await loadPremadeNodes();
  return all[story.nodesKey];
}
