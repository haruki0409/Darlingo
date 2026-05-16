import 'package:flutter/material.dart';

import '../../data/premade_stories.dart';
import '../../models/story_node.dart';
import '../../theme.dart';
import '../story_lesson_screen.dart';
import 'custom_story_screen.dart';

const _languages = {'ja': '🇯🇵 日本語', 'ko': '🇰🇷 한국어'};

/// Story Mode entry: browse pre-made stories (bundled offline) and launch
/// custom-story creation. Only "Create your own" hits the backend; tapping a
/// pre-made card reads nodes from local assets.
class StoryPickerScreen extends StatefulWidget {
  const StoryPickerScreen({super.key});

  @override
  State<StoryPickerScreen> createState() => _StoryPickerScreenState();
}

class _StoryPickerScreenState extends State<StoryPickerScreen> {
  late Future<Map<String, List<StoryNode>>> _nodesFuture;
  String _lang = 'ja';

  @override
  void initState() {
    super.initState();
    _nodesFuture = loadPremadeNodes();
  }

  Future<void> _playPremade(PremadeStory story) async {
    final map = await _nodesFuture;
    final nodes = map[story.nodesKey];
    if (!mounted) return;
    if (nodes == null || nodes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('이 스토리는 아직 준비되지 않았어요.')),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StoryLessonScreen(
          nodes: nodes,
          storyTitle: story.title,
        ),
      ),
    );
  }

  Future<void> _createCustom() async {
    final created = await Navigator.of(context).push<CustomStoryResult>(
      MaterialPageRoute(builder: (_) => const CustomStoryScreen()),
    );
    if (created == null || !mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StoryLessonScreen(
          nodes: created.nodes,
          storyTitle: created.title,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SakuraScaffold(
      appBar: AppBar(title: const Text('Stories')),
      body: SafeArea(
        child: FutureBuilder<Map<String, List<StoryNode>>>(
          future: _nodesFuture,
          builder: (context, snap) {
            final ready = snap.connectionState == ConnectionState.done;
            final Set<String> availableKeys = ready
                ? (snap.data?.keys.toSet() ?? <String>{})
                : <String>{};
            final premade =
                kPremadeStories.where((s) => s.language == _lang).toList();

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
                _sectionLabel('Pre-made stories'),
                for (final s in premade)
                  _storyCard(s, available: availableKeys.contains(s.nodesKey)),
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

  Widget _storyCard(PremadeStory story, {required bool available}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Opacity(
        opacity: available ? 1.0 : 0.55,
        child: GestureDetector(
          onTap: available ? () => _playPremade(story) : null,
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: available ? kAccentGradient : null,
                    color: available ? null : const Color(0xFFE8DFF0),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    available
                        ? Icons.auto_stories_rounded
                        : Icons.lock_rounded,
                    color: available
                        ? Colors.white
                        : const Color(0xFFA68BB8),
                    size: 22,
                  ),
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
                Icon(
                  available
                      ? Icons.play_circle_fill_rounded
                      : Icons.lock_outline_rounded,
                  color: available
                      ? AppColors.purple
                      : const Color(0xFFA68BB8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
