import 'package:flutter/material.dart';

import '../../models/curriculum.dart';
import '../../services/api.dart';
import '../../theme.dart';
import 'lesson_player_screen.dart';

const _languages = {'ko': '🇰🇷 한국어', 'ja': '🇯🇵 日本語'};
const _levels = ['beginner', 'intermediate', 'advanced'];

/// Curriculum Mode: the structured unit/lesson path. Tapping a lesson previews
/// what it teaches. The exercise player arrives in Milestone C2.
class CurriculumScreen extends StatefulWidget {
  const CurriculumScreen({super.key});

  @override
  State<CurriculumScreen> createState() => _CurriculumScreenState();
}

class _CurriculumScreenState extends State<CurriculumScreen> {
  String _language = 'ko';
  String _level = 'beginner';
  late Future<List<CurriculumUnit>> _future;

  @override
  void initState() {
    super.initState();
    _future = Api.getCurriculum(_language, _level);
  }

  void _reload() {
    setState(() => _future = Api.getCurriculum(_language, _level));
  }

  @override
  Widget build(BuildContext context) {
    return SakuraScaffold(
      appBar: AppBar(title: const Text('Curriculum')),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
              child: Row(
                children: [
                  Expanded(
                    child: _dropdown<String>(
                      value: _language,
                      items: _languages.keys,
                      labelOf: (k) => _languages[k]!,
                      onChanged: (v) {
                        _language = v;
                        _reload();
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _dropdown<String>(
                      value: _level,
                      items: _levels,
                      labelOf: _titleCase,
                      onChanged: (v) {
                        _level = v;
                        _reload();
                      },
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<List<CurriculumUnit>>(
                future: _future,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: AppColors.purple),
                          SizedBox(height: 16),
                          Text(
                            '✨ Building your curriculum…',
                            style: TextStyle(
                              color: AppColors.textHeading,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  if (snap.hasError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Could not load curriculum:\n${snap.error}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.errorText),
                        ),
                      ),
                    );
                  }
                  final units = snap.data ?? [];
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(16, 2, 16, 24),
                    children: [
                      for (final unit in units) _unitSection(unit),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _unitSection(CurriculumUnit unit) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(2, 18, 2, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Unit ${unit.idx} · ${unit.title}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                unit.description,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        for (final lesson in unit.lessons) _lessonCard(lesson),
      ],
    );
  }

  Widget _lessonCard(CurriculumLesson lesson) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: () => _showLesson(lesson),
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  gradient: kAccentGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  '${lesson.idx}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      lesson.focus,
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
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textLabel),
            ],
          ),
        ),
      ),
    );
  }

  void _showLesson(CurriculumLesson lesson) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _LessonPreviewSheet(
        lesson: lesson,
        onStart: () {
          Navigator.of(context).pop();
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => LessonPlayerScreen(
                lessonId: lesson.id,
                lessonTitle: lesson.title,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _dropdown<T>({
    required T value,
    required Iterable<T> items,
    required String Function(T) labelOf,
    required ValueChanged<T> onChanged,
  }) =>
      DropdownButtonFormField<T>(
        initialValue: value,
        isExpanded: true,
        items: items
            .map((e) => DropdownMenuItem(value: e, child: Text(labelOf(e))))
            .toList(),
        onChanged: (v) {
          if (v != null) onChanged(v);
        },
      );

  static String _titleCase(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

/// Bottom sheet previewing what a lesson teaches.
class _LessonPreviewSheet extends StatelessWidget {
  const _LessonPreviewSheet({required this.lesson, required this.onStart});

  final CurriculumLesson lesson;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Lesson ${lesson.idx} · ${lesson.title}',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 16,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              lesson.focus,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              "What you'll learn",
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.45,
              ),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: lesson.targetItems.length,
                separatorBuilder: (_, __) => const Divider(height: 14),
                itemBuilder: (_, i) => _itemRow(lesson.targetItems[i]),
              ),
            ),
            const SizedBox(height: 16),
            GradientButton(
              label: 'Start lesson',
              icon: Icons.play_arrow_rounded,
              onPressed: onStart,
            ),
          ],
        ),
      ),
    );
  }

  Widget _itemRow(TargetItem item) {
    final isGrammar = item.kind == 'grammar';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: (isGrammar ? AppColors.purpleSoft : AppColors.pinkSoft)
                .withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            isGrammar ? 'gram' : 'vocab',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: isGrammar ? AppColors.purple : AppColors.pink,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    item.term,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: AppColors.textDark,
                    ),
                  ),
                  if (item.reading.isNotEmpty &&
                      item.reading != item.term) ...[
                    const SizedBox(width: 6),
                    Text(
                      item.reading,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textLabel,
                      ),
                    ),
                  ],
                ],
              ),
              Text(
                item.meaning,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
