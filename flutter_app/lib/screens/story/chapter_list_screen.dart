import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/chapter.dart';
import '../../models/story.dart';
import '../../services/api.dart';
import '../../theme.dart';
import '../onboarding/story_wizard_screen.dart';
import '../story_lesson_screen.dart';
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

  Future<void> _startNewStory() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('새 스토리 시작'),
        content: const Text(
          '새 스토리 마법사로 이동해요. 지금 보고 있는 스토리는 그대로 남아 있어요.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.purple),
            child: const Text('시작'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => const StoryWizardScreen()),
    );
    if (mounted) await _reload();
  }

  Future<void> _signOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('로그아웃 할까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.pinkSoft),
            child: const Text('로그아웃'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await Supabase.instance.client.auth.signOut();
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
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            tooltip: '새 스토리',
            onPressed: _startNewStory,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: '로그아웃',
            onPressed: _signOut,
          ),
        ],
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
            _DemoLessonCard(
              onTap: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => const StoryLessonScreen(),
                ),
              ),
            ),
            const SizedBox(height: 14),
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

class _DemoLessonCard extends StatelessWidget {
  final VoidCallback onTap;
  const _DemoLessonCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          height: 132,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFF6BA0).withOpacity(0.32),
                blurRadius: 22,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/images/japanese_woman1.jpg',
                  fit: BoxFit.cover,
                  alignment: const Alignment(0, -0.2),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        const Color(0xFFA94BE0).withOpacity(0.85),
                        const Color(0xFFA94BE0).withOpacity(0.35),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.55, 1.0],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 9, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.auto_awesome_rounded,
                                    color: Color(0xFFA94BE0), size: 12),
                                SizedBox(width: 4),
                                Text(
                                  '체험 레슨',
                                  style: TextStyle(
                                    color: Color(0xFFA94BE0),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '東京での出会い',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              height: 1.1,
                              shadows: [
                                Shadow(
                                  color: Colors.black38,
                                  blurRadius: 6,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  '도쿄에서의 첫 만남 · 미니퀴즈 포함',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(11),
                                ),
                                child: const Icon(
                                  Icons.play_arrow_rounded,
                                  color: Color(0xFFA94BE0),
                                  size: 22,
                                ),
                              ),
                            ],
                          ),
                        ],
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
