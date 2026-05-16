import 'package:flutter/material.dart';

import '../../models/node_story.dart';
import '../../services/api.dart';
import '../../theme.dart';
import '../story_lesson_screen.dart';
import 'custom_story_screen.dart';

const _languages = {'ja': '🇯🇵 日本語', 'ko': '🇰🇷 한국어'};

/// Story Mode entry: browse pre-made stories (by language) and custom stories,
/// or create a new custom story.
class StoryPickerScreen extends StatefulWidget {
  const StoryPickerScreen({super.key});

  @override
  State<StoryPickerScreen> createState() => _StoryPickerScreenState();
}

class _StoryPickerScreenState extends State<StoryPickerScreen> {
  late Future<({List<NodeStory> premade, List<NodeStory> custom})> _future;
  String _lang = 'ja';

  @override
  void initState() {
    super.initState();
    _future = Api.listNodeStories();
  }

  void _reload() => setState(() => _future = Api.listNodeStories());

  void _play(NodeStory story) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StoryLessonScreen(
          storyId: story.id,
          storyTitle: story.title,
        ),
      ),
    );
  }

  Future<void> _createCustom() async {
    final created = await Navigator.of(context).push<NodeStory>(
      MaterialPageRoute(builder: (_) => const CustomStoryScreen()),
    );
    if (created != null) {
      _reload();
      if (mounted) _play(created);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SakuraScaffold(
      appBar: AppBar(title: const Text('Stories')),
      body: SafeArea(
        child:
            FutureBuilder<({List<NodeStory> premade, List<NodeStory> custom})>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(
                child: CircularProgressIndicator(color: AppColors.purple),
              );
            }
            if (snap.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Could not load stories:\n${snap.error}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.errorText),
                  ),
                ),
              );
            }
            final data = snap.data!;
            final premade =
                data.premade.where((s) => s.language == _lang).toList();
            final custom =
                data.custom.where((s) => s.language == _lang).toList();
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                _langToggle(),
                const SizedBox(height: 14),
                GradientButton(
                  label: 'Create your own story',
                  icon: Icons.auto_awesome_rounded,
                  onPressed: _createCustom,
                ),
                if (custom.isNotEmpty) ...[
                  _sectionLabel('Your stories'),
                  for (final s in custom) _storyCard(s),
                ],
                _sectionLabel('Pre-made stories'),
                for (final s in premade) _storyCard(s),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _langToggle() {
    return Row(
      children: [
        for (final entry in _languages.entries)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => setState(() => _lang = entry.key),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: _lang == entry.key ? kAccentGradient : null,
                    color: _lang == entry.key
                        ? null
                        : Colors.white.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    entry.value,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: _lang == entry.key
                          ? Colors.white
                          : AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 20, 2, 8),
        child: Text(
          text,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 15,
            color: AppColors.textHeading,
          ),
        ),
      );

  Widget _storyCard(NodeStory story) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => _play(story),
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: kAccentGradient,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.auto_stories_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      story.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      story.premise,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.play_circle_fill_rounded,
                  color: AppColors.purple),
            ],
          ),
        ),
      ),
    );
  }
}
