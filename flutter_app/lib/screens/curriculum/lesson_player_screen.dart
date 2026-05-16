import 'package:flutter/material.dart';

import '../../models/exercise.dart';
import '../../services/api.dart';
import '../../theme.dart';

/// Plays a curriculum lesson exercise-by-exercise: prompt → answer → feedback.
class LessonPlayerScreen extends StatefulWidget {
  const LessonPlayerScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
  });

  final String lessonId;
  final String lessonTitle;

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  final _textCtrl = TextEditingController();

  bool _loading = true;
  String? _error;
  List<Exercise> _exercises = [];
  int _index = 0;
  int _score = 0;
  String? _selected; // chosen multiple-choice option
  GradeResult? _result; // result for the current exercise
  bool _grading = false;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Exercise get _current => _exercises[_index];

  Future<void> _start() async {
    try {
      final exercises = await Api.startLesson(widget.lessonId);
      if (!mounted) return;
      setState(() {
        _exercises = exercises;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = '$e';
        });
      }
    }
  }

  Future<void> _grade(String answer) async {
    if (answer.trim().isEmpty || _grading || _result != null) return;
    setState(() {
      _grading = true;
      _selected = answer;
    });
    try {
      final result = await Api.gradeExercise(
        widget.lessonId,
        _current.index,
        answer.trim(),
      );
      if (!mounted) return;
      setState(() {
        _result = result;
        _grading = false;
        if (result.correct) _score++;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _grading = false;
          _selected = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Grading failed: $e')),
        );
      }
    }
  }

  void _next() {
    if (_index + 1 >= _exercises.length) {
      setState(() => _finished = true);
    } else {
      setState(() {
        _index++;
        _result = null;
        _selected = null;
        _textCtrl.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SakuraScaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppColors.purple),
              SizedBox(height: 16),
              Text(
                '✨ Preparing your lesson…',
                style: TextStyle(
                  color: AppColors.textHeading,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_error != null && _exercises.isEmpty) {
      return SakuraScaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Could not start lesson:\n$_error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.errorText),
            ),
          ),
        ),
      );
    }
    if (_finished) return _resultsView();
    return _exerciseView();
  }

  Widget _exerciseView() {
    final ex = _current;
    return SakuraScaffold(
      appBar: AppBar(title: Text(widget.lessonTitle)),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Column(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (_index + 1) / _exercises.length,
                      minHeight: 8,
                      backgroundColor: Colors.white.withValues(alpha: 0.5),
                      color: AppColors.purple,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_index + 1} / ${_exercises.length}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                children: [
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ex.isMultipleChoice
                              ? 'Choose the answer'
                              : 'Translate',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textLabel,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          ex.prompt,
                          style: const TextStyle(
                            fontSize: 17,
                            color: AppColors.textDark,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (ex.isMultipleChoice)
                    ...ex.options.map(_optionTile)
                  else
                    TextField(
                      controller: _textCtrl,
                      enabled: _result == null && !_grading,
                      decoration: const InputDecoration(
                        hintText: 'Type your answer…',
                      ),
                      onSubmitted: _grade,
                    ),
                  if (_result != null) ...[
                    const SizedBox(height: 12),
                    _feedbackPanel(_result!),
                  ],
                ],
              ),
            ),
            _bottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _optionTile(String option) {
    final answered = _result != null;
    var bg = Colors.white.withValues(alpha: 0.9);
    var border = AppColors.purpleSoft.withValues(alpha: 0.3);
    if (answered) {
      if (option == _result!.correctAnswer) {
        bg = const Color(0xFFE3F4E6);
        border = const Color(0xFF4CAF50);
      } else if (option == _selected) {
        bg = AppColors.errorBg;
        border = AppColors.errorText;
      }
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: (answered || _grading) ? null : () => _grade(option),
        child: Container(
          width: double.infinity,
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: border, width: 1.4),
          ),
          child: Text(
            option,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
        ),
      ),
    );
  }

  Widget _feedbackPanel(GradeResult result) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: result.correct ? const Color(0xFFE3F4E6) : AppColors.errorBg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                result.correct
                    ? Icons.check_circle_rounded
                    : Icons.cancel_rounded,
                size: 18,
                color: result.correct
                    ? const Color(0xFF2E7D32)
                    : AppColors.errorText,
              ),
              const SizedBox(width: 6),
              Text(
                result.correct ? 'Correct!' : 'Not quite',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: result.correct
                      ? const Color(0xFF2E7D32)
                      : AppColors.errorText,
                ),
              ),
            ],
          ),
          if (!result.correct) ...[
            const SizedBox(height: 4),
            Text(
              'Answer: ${result.correctAnswer}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
          ],
          if (result.feedback.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              result.feedback,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _bottomBar() {
    final isLast = _index + 1 >= _exercises.length;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: _result != null
          ? GradientButton(
              label: isLast ? 'Finish' : 'Next',
              icon: isLast
                  ? Icons.flag_rounded
                  : Icons.arrow_forward_rounded,
              onPressed: _next,
            )
          : _current.isMultipleChoice
              ? const SizedBox(
                  height: 20,
                  child: Center(
                    child: Text(
                      'Pick an answer above',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textLabel,
                      ),
                    ),
                  ),
                )
              : GradientButton(
                  label: 'Check',
                  busy: _grading,
                  onPressed:
                      _grading ? null : () => _grade(_textCtrl.text),
                ),
    );
  }

  Widget _resultsView() {
    return SakuraScaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🎉', style: TextStyle(fontSize: 44)),
                  const SizedBox(height: 8),
                  const Text(
                    'Lesson complete!',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: AppColors.textHeading,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$_score / ${_exercises.length} correct',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppColors.purple,
                    ),
                  ),
                  const SizedBox(height: 18),
                  GradientButton(
                    label: 'Done',
                    icon: Icons.check_rounded,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
