import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/api.dart';
import '../../services/chat_socket.dart';
import '../../theme.dart';

/// Visual-novel chapter play screen: background + partner sprite + dialogue
/// box, with text input. Background and sprite are placeholders keyed by
/// `setting_tag` / emotion until the assets team delivers real art.
class ChapterPlayScreen extends StatefulWidget {
  const ChapterPlayScreen({
    super.key,
    required this.chapterId,
    required this.language,
    required this.level,
  });

  final String chapterId;
  final String language;
  final String level;

  @override
  State<ChapterPlayScreen> createState() => _ChapterPlayScreenState();
}

class _ChapterPlayScreenState extends State<ChapterPlayScreen> {
  final _inputCtrl = TextEditingController();

  bool _loading = true;
  String? _error;

  ChatSocket? _socket;
  String _partnerName = '';
  String _settingTag = 'street';
  String _emotion = 'neutral';
  String _partnerLine = '';
  String _objectiveHint = '';
  String? _lastUserLine;
  bool _busy = false;
  bool _complete = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _socket?.close();
    _inputCtrl.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    try {
      final start = await Api.startChapter(widget.chapterId);
      final token =
          Supabase.instance.client.auth.currentSession!.accessToken;
      final socket =
          ChatSocket(token: token, conversationId: start.conversationId);
      socket.connect().listen(
        _onEvent,
        onError: (_) {
          if (mounted) setState(() => _busy = false);
        },
      );
      if (!mounted) return;
      setState(() {
        _partnerName = start.partnerName;
        _settingTag = start.chapter.settingTag;
        _emotion = start.scene.partnerEmotion;
        _objectiveHint = start.scene.objectiveHint;
        _partnerLine = '${start.scene.partnerOpeningLine}\n'
            '[en] ${start.scene.partnerOpeningLineEn}';
        _socket = socket;
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

  void _onEvent(ChatEvent event) {
    if (!mounted) return;
    setState(() {
      if (event.type == 'chunk') {
        _partnerLine = event.text ?? '';
      } else if (event.type == 'done') {
        _busy = false;
        if (event.emotion != null) _emotion = event.emotion!;
        if (event.chapterComplete) _complete = true;
      } else if (event.type == 'error') {
        _busy = false;
        _partnerLine = '⚠️ ${event.text}';
      }
    });
  }

  void _send() {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _busy || _socket == null) return;
    setState(() {
      _lastUserLine = text;
      _busy = true;
      _partnerLine = '…';
      _inputCtrl.clear();
    });
    _socket!.send(text, widget.language, widget.level);
  }

  Future<void> _finishChapter() async {
    setState(() => _busy = true);
    try {
      final wrapup = await Api.completeChapter(widget.chapterId);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Chapter complete!'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(wrapup.summary),
              const SizedBox(height: 12),
              const Text(
                'Vocabulary practiced',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(wrapup.vocabPracticed.join('   ·   ')),
              if (wrapup.storyCompleted) ...[
                const SizedBox(height: 12),
                const Text('🎉 You finished the whole story!'),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop(true); // signal list to refresh
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Setting the scene…'),
            ],
          ),
        ),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Could not start chapter:\n$_error')),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(child: _background()),
          SafeArea(
            child: Column(
              children: [
                _objectiveBanner(),
                Expanded(child: Center(child: _sprite())),
                if (_lastUserLine != null) _userLine(),
                _dialogueBox(),
                _complete ? _completeBar() : _inputRow(),
              ],
            ),
          ),
          Positioned(
            top: 4,
            left: 4,
            child: SafeArea(
              child: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _background() {
    final colors = _settingColors[_settingTag] ??
        const [Color(0xFFB0BEC5), Color(0xFFECEFF1)];
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: colors,
        ),
      ),
    );
  }

  Widget _objectiveBanner() => Container(
        width: double.infinity,
        margin: const EdgeInsets.fromLTRB(48, 8, 8, 0),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          '🎯 $_objectiveHint',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      );

  /// Placeholder sprite — swap for real art keyed by (partner, emotion) once
  /// the assets team delivers sprite sets.
  Widget _sprite() => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 160,
            height: 160,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.85),
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 12),
              ],
            ),
            alignment: Alignment.center,
            child: Text(
              _emotionEmoji[_emotion] ?? '🙂',
              style: const TextStyle(fontSize: 72),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$_partnerName · $_emotion',
            style: const TextStyle(
              color: Colors.black54,
              fontSize: 12,
            ),
          ),
        ],
      );

  Widget _userLine() => Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
        child: Text(
          'You: $_lastUserLine',
          style: const TextStyle(
            color: Colors.black54,
            fontStyle: FontStyle.italic,
            fontSize: 13,
          ),
        ),
      );

  Widget _dialogueBox() {
    final (line, gloss) = _splitGloss(_partnerLine);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _partnerName,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: AppColors.purple,
            ),
          ),
          const SizedBox(height: 6),
          Text(line, style: const TextStyle(fontSize: 17)),
          if (gloss != null) ...[
            const SizedBox(height: 4),
            Text(
              gloss,
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }

  Widget _inputRow() => Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _inputCtrl,
                enabled: !_busy,
                decoration: InputDecoration(
                  hintText: 'Reply to $_partnerName…',
                  filled: true,
                  fillColor: Colors.white,
                  border: const OutlineInputBorder(),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _busy ? null : _send,
              child: Text(_busy ? '…' : 'Send'),
            ),
          ],
        ),
      );

  Widget _completeBar() => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            const Text(
              '🎉 Chapter objective reached!',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 8),
            GradientButton(
              label: 'Finish chapter',
              icon: Icons.celebration_rounded,
              busy: _busy,
              onPressed: _busy ? null : _finishChapter,
            ),
          ],
        ),
      );

  /// Split a "<target language>\n[en] <english>" string into its two parts.
  (String, String?) _splitGloss(String text) {
    final marker = text.indexOf('[en]');
    if (marker == -1) return (text.trim(), null);
    return (
      text.substring(0, marker).trim(),
      text.substring(marker + 4).trim(),
    );
  }
}

/// Background gradient colors keyed by `setting_tag`. Replaced by real
/// background art once the assets team delivers the pack.
const _settingColors = <String, List<Color>>{
  'classroom': [Color(0xFFB3E5FC), Color(0xFFE1F5FE)],
  'schoolyard': [Color(0xFFC5E1A5), Color(0xFFF1F8E9)],
  'hallway': [Color(0xFFCFD8DC), Color(0xFFECEFF1)],
  'cafe': [Color(0xFFD7CCC8), Color(0xFFEFEBE9)],
  'restaurant': [Color(0xFFFFCCBC), Color(0xFFFBE9E7)],
  'street': [Color(0xFFB0BEC5), Color(0xFFECEFF1)],
  'park': [Color(0xFFC8E6C9), Color(0xFFE8F5E9)],
  'home_room': [Color(0xFFFFE0B2), Color(0xFFFFF3E0)],
  'train_station': [Color(0xFFB0BEC5), Color(0xFFCFD8DC)],
  'convenience_store': [Color(0xFFFFF9C4), Color(0xFFFFFDE7)],
  'rooftop': [Color(0xFF90CAF9), Color(0xFFE3F2FD)],
  'park_night': [Color(0xFF3949AB), Color(0xFF1A237E)],
};

/// Emoji stand-ins for partner emotions until real sprites land.
const _emotionEmoji = <String, String>{
  'neutral': '🙂',
  'happy': '😊',
  'sad': '😢',
  'surprised': '😲',
  'embarrassed': '😳',
  'shy': '🙈',
  'thinking': '🤔',
  'excited': '🤩',
};
