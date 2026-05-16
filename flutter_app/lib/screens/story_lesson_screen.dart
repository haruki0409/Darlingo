import 'package:flutter/material.dart';

import '../models/story_node.dart';

const _pink = Color(0xFFFF6BA0);
const _purple = Color(0xFFA94BE0);
const _ink = Color(0xFF2A1638);
const _inkSoft = Color(0xFF5C3A6E);
const _muted = Color(0xFF80678F);

/// Plays a node-based story (narration / dialogue / quiz). Nodes are passed in
/// directly — caller is responsible for fetching/providing them, so this
/// screen does not hit the network.
class StoryLessonScreen extends StatefulWidget {
  const StoryLessonScreen({
    super.key,
    required this.nodes,
    required this.storyTitle,
  });

  final List<StoryNode> nodes;
  final String storyTitle;

  @override
  State<StoryLessonScreen> createState() => _StoryLessonScreenState();
}

class _StoryLessonScreenState extends State<StoryLessonScreen>
    with TickerProviderStateMixin {
  late final AnimationController _shake;
  late final List<StoryNode> _story = widget.nodes;

  int _index = 0;
  int? _picked;
  bool _checked = false;
  int _hearts = 5;
  int _xp = 0;
  int _correct = 0;

  int get _totalQuizzes => _story.whereType<QuizNode>().length;

  @override
  void initState() {
    super.initState();
    _shake = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
  }

  @override
  void dispose() {
    _shake.dispose();
    super.dispose();
  }

  StoryNode get _node => _story[_index];
  double get _progress => (_index + 1) / _story.length;

  void _advance() {
    if (_index >= _story.length - 1) {
      _showComplete();
      return;
    }
    setState(() {
      _index++;
      _picked = null;
      _checked = false;
    });
  }

  void _pick(int i) {
    if (_checked) return;
    setState(() => _picked = i);
  }

  void _check() {
    final node = _node;
    if (node is! QuizNode || _picked == null) return;
    final ok = _picked == node.correctIndex;
    setState(() {
      _checked = true;
      if (ok) {
        _correct++;
        _xp += 10;
      } else {
        _hearts = (_hearts - 1).clamp(0, 5);
      }
    });
    if (!ok) _shake.forward(from: 0);
  }

  void _restart() {
    setState(() {
      _index = 0;
      _picked = null;
      _checked = false;
      _correct = 0;
      _xp = 0;
      _hearts = 5;
    });
  }

  void _showComplete() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => _CompleteSheet(
        title: widget.storyTitle,
        xp: _xp,
        correct: _correct,
        total: _totalQuizzes,
        onRestart: () {
          Navigator.of(context).pop();
          _restart();
        },
        onExit: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Future<void> _confirmExit() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('나가시겠어요?'),
        content: const Text('이번 이야기 진행 상황은 저장되지 않아요.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('계속하기'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: _pink),
            child: const Text('나가기'),
          ),
        ],
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    if (_story.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              '이 스토리는 아직 준비되지 않았어요.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/japanese_woman1.jpg',
            fit: BoxFit.cover,
            alignment: const Alignment(0, -0.25),
            errorBuilder: (_, __, ___) => const ColoredBox(
              color: Color(0xFF2A1638),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.0, 0.18, 0.45, 1.0],
                colors: [
                  Colors.black.withValues(alpha: 0.55),
                  Colors.black.withValues(alpha: 0.0),
                  Colors.black.withValues(alpha: 0.05),
                  Colors.black.withValues(alpha: 0.78),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                _topBar(),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: _bottomCard(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 6, 12, 0),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white),
            tooltip: '나가기',
            onPressed: _confirmExit,
          ),
          Expanded(
            child: Container(
              height: 12,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.25),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.35),
                  width: 1,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: TweenAnimationBuilder<double>(
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeOutCubic,
                  tween: Tween(begin: 0, end: _progress),
                  builder: (context, value, _) => FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: value.clamp(0.0, 1.0),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [_pink, _purple],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _pink.withValues(alpha: 0.55),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          _Pill(
            icon: Icons.favorite_rounded,
            value: '$_hearts',
            color: const Color(0xFFFF5C8A),
          ),
          const SizedBox(width: 6),
          _Pill(
            icon: Icons.star_rounded,
            value: '$_xp',
            color: const Color(0xFFFFC840),
          ),
        ],
      ),
    );
  }

  Widget _bottomCard() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 260),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeIn,
      transitionBuilder: (child, anim) => SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.08),
          end: Offset.zero,
        ).animate(anim),
        child: FadeTransition(opacity: anim, child: child),
      ),
      child: KeyedSubtree(
        key: ValueKey(_index),
        child: switch (_node) {
          NarrationNode n => _narration(n),
          DialogueNode d => _dialogue(d),
          QuizNode q => _quiz(q),
        },
      ),
    );
  }

  Widget _glassCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.white, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _narration(NarrationNode n) {
    return GestureDetector(
      onTap: _advance,
      behavior: HitTestBehavior.opaque,
      child: _glassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const _TagPill(
              label: 'narration',
              icon: Icons.menu_book_rounded,
              bg: Color(0xFF3D2548),
              fg: Colors.white,
            ),
            const SizedBox(height: 14),
            Text(
              n.target,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: _ink,
                height: 1.55,
                fontStyle: FontStyle.italic,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              n.translation,
              style: const TextStyle(
                fontSize: 13,
                color: _muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            const Align(alignment: Alignment.centerRight, child: _NextHint()),
          ],
        ),
      ),
    );
  }

  Widget _dialogue(DialogueNode d) {
    return GestureDetector(
      onTap: _advance,
      behavior: HitTestBehavior.opaque,
      child: _glassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_pink, _purple]),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: _pink.withValues(alpha: 0.45),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.favorite_rounded,
                      color: Colors.white, size: 13),
                  const SizedBox(width: 6),
                  Text(
                    d.speaker,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              d.target,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: _ink,
                height: 1.45,
              ),
            ),
            if (d.reading.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                d.reading,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFFB066C9),
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFFAF4FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEAD8F5)),
              ),
              child: Row(
                children: [
                  const Text('💬', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      d.translation,
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: _inkSoft,
                        fontWeight: FontWeight.w600,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Align(alignment: Alignment.centerRight, child: _NextHint()),
          ],
        ),
      ),
    );
  }

  Widget _quiz(QuizNode q) {
    final ok = _checked && _picked == q.correctIndex;
    final bad = _checked && _picked != q.correctIndex;

    return AnimatedBuilder(
      animation: _shake,
      builder: (context, child) {
        final dx = bad
            ? 10 *
                (1 - _shake.value) *
                ((((_shake.value * 8).floor()) % 2 == 0) ? 1 : -1)
            : 0.0;
        return Transform.translate(
          offset: Offset(dx.toDouble(), 0),
          child: child,
        );
      },
      child: _glassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const _TagPill(
              label: 'mini quiz',
              icon: Icons.bolt_rounded,
              bg: Color(0xFF3D2548),
              fg: Colors.white,
              accent: Color(0xFFFFC840),
            ),
            const SizedBox(height: 12),
            Text(
              q.prompt,
              style: const TextStyle(
                fontSize: 17.5,
                fontWeight: FontWeight.w800,
                color: _ink,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            ...List.generate(q.options.length, (i) => _optionTile(q, i)),
            if (_checked) ...[
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ok
                      ? const Color(0xFFE0F8E8)
                      : const Color(0xFFFFE0E8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      ok
                          ? Icons.celebration_rounded
                          : Icons.lightbulb_rounded,
                      color: ok
                          ? const Color(0xFF2F8C4A)
                          : const Color(0xFFB83968),
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        ok ? '正解！  +10 XP ✨' : q.explanation,
                        style: TextStyle(
                          color: ok
                              ? const Color(0xFF1F5C2F)
                              : const Color(0xFFB83968),
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _checked
                    ? _advance
                    : (_picked == null ? null : _check),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _checked
                      ? (ok ? const Color(0xFF4CC468) : _purple)
                      : _pink,
                  disabledBackgroundColor: const Color(0xFFE8DFF0),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  _checked ? '계속하기' : '확인',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    letterSpacing: 0.6,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _optionTile(QuizNode q, int i) {
    final picked = _picked == i;
    final correct = q.correctIndex == i;

    Color bg = const Color(0xFFFAF4FF);
    Color border = const Color(0xFFEAD8F5);
    Color text = _ink;
    Color chipBg = const Color(0xFFEAD8F5);

    if (_checked) {
      if (correct) {
        bg = const Color(0xFFE0F8E8);
        border = const Color(0xFF4CC468);
        text = const Color(0xFF1F5C2F);
        chipBg = const Color(0xFFB6E8C2);
      } else if (picked) {
        bg = const Color(0xFFFFE0E8);
        border = const Color(0xFFE56B91);
        text = const Color(0xFF7A2245);
        chipBg = const Color(0xFFF5BBCB);
      }
    } else if (picked) {
      bg = const Color(0xFFF3DDFF);
      border = const Color(0xFFB565E8);
      text = _inkSoft;
      chipBg = const Color(0xFFE0C8F5);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _pick(i),
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: border, width: 1.6),
            ),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: chipBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    String.fromCharCode(65 + i),
                    style: TextStyle(
                      color: text,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    q.options[i],
                    style: TextStyle(
                      color: text,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (_checked && correct)
                  const Icon(Icons.check_circle_rounded,
                      color: Color(0xFF4CC468), size: 20),
                if (_checked && picked && !correct)
                  const Icon(Icons.cancel_rounded,
                      color: Color(0xFFE56B91), size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String value;
  final Color color;
  const _Pill({
    required this.icon,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _TagPill extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color bg;
  final Color fg;
  final Color? accent;
  const _TagPill({
    required this.label,
    required this.icon,
    required this.bg,
    required this.fg,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: bg.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: accent ?? fg, size: 13),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _NextHint extends StatefulWidget {
  const _NextHint();

  @override
  State<_NextHint> createState() => _NextHintState();
}

class _NextHintState extends State<_NextHint>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.35, end: 1.0).animate(_c),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '탭해서 계속',
            style: TextStyle(
              fontSize: 11.5,
              color: Color(0xFFB066C9),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
            ),
          ),
          SizedBox(width: 4),
          Icon(Icons.touch_app_rounded, size: 14, color: Color(0xFFB066C9)),
        ],
      ),
    );
  }
}

class _CompleteSheet extends StatelessWidget {
  final String title;
  final int xp;
  final int correct;
  final int total;
  final VoidCallback onRestart;
  final VoidCallback onExit;
  const _CompleteSheet({
    required this.title,
    required this.xp,
    required this.correct,
    required this.total,
    required this.onRestart,
    required this.onExit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 14, 24, 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFE8DFF0),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 22),
            const Text('🎉', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 8),
            ShaderMask(
              shaderCallback: (b) => const LinearGradient(
                colors: [_pink, _purple],
              ).createShader(b),
              child: const Text(
                'Story complete!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: _muted),
            ),
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _Stat(
                  icon: Icons.star_rounded,
                  color: const Color(0xFFFFC840),
                  value: '$xp',
                  label: 'XP',
                ),
                _Stat(
                  icon: Icons.check_circle_rounded,
                  color: const Color(0xFF4CC468),
                  value: '$correct / $total',
                  label: 'quiz',
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton(
                      onPressed: onRestart,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _purple,
                        side: const BorderSide(color: Color(0xFFE0C8F5)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        '다시 하기',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: onExit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _pink,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        '완료',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  const _Stat({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: _ink,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: _muted,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
