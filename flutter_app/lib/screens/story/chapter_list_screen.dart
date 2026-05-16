import 'package:flutter/material.dart';

import '../../models/chapter.dart';
import '../../models/story.dart';
import '../../services/api.dart';
import '../../theme.dart';
import 'chapter_play_screen.dart';

/// Shows a story's chapters. Tapping an unlocked chapter opens the visual-novel
/// play screen; the list refreshes when the player returns.
class ChapterListScreen extends StatefulWidget {
  const ChapterListScreen({
    super.key,
    required this.story,
    required this.chapters,
  });

  final Story story;
  final List<Chapter> chapters;

  @override
  State<ChapterListScreen> createState() => _ChapterListScreenState();
}

class _ChapterListScreenState extends State<ChapterListScreen> {
  late Story _story = widget.story;
  late List<Chapter> _chapters = widget.chapters;
  bool _refreshing = false;

  Future<void> _reload() async {
    setState(() => _refreshing = true);
    try {
      final (story, chapters) = await Api.getStory(_story.id);
      if (!mounted) return;
      setState(() {
        _story = story;
        _chapters = chapters;
        _refreshing = false;
      });
    } catch (_) {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _openChapter(Chapter chapter) async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChapterPlayScreen(
          chapterId: chapter.id,
          language: _story.language,
          level: _story.level,
        ),
      ),
    );
    // Statuses may have changed (chapter completed, next unlocked).
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return SakuraScaffold(
      appBar: AppBar(
        title: Text(_story.title),
        bottom: _refreshing
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(
                  minHeight: 2,
                  color: AppColors.purple,
                  backgroundColor: Colors.transparent,
                ),
              )
            : null,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _story.premise,
                    style: const TextStyle(
                      color: AppColors.textDark,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '${_story.genre}  ·  ${_story.tone}  ·  '
                    '${_story.totalChapters} chapters',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            for (final chapter in _chapters) _chapterTile(chapter),
          ],
        ),
      ),
    );
  }

  Widget _chapterTile(Chapter chapter) {
    final (icon, tint) = switch (chapter.status) {
      'completed' => (Icons.check_circle_rounded, AppColors.pinkSoft),
      'available' || 'in_progress' => (
          Icons.play_circle_fill_rounded,
          AppColors.purple,
        ),
      _ => (Icons.lock_rounded, AppColors.textLabel),
    };
    final locked = chapter.isLocked;

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Opacity(
        opacity: locked ? 0.6 : 1,
        child: GestureDetector(
          onTap: locked ? null : () => _openChapter(chapter),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(icon, color: tint, size: 30),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${chapter.idx}. ${chapter.title}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.textHeading,
                          fontSize: 14.5,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        chapter.premise,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12.5,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
