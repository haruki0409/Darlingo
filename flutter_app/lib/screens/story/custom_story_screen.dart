import 'package:flutter/material.dart';

import '../../models/story_node.dart';
import '../../services/api.dart';
import '../../theme.dart';

/// What CustomStoryScreen pops with when generation succeeds.
class CustomStoryResult {
  const CustomStoryResult({required this.title, required this.nodes});
  final String title;
  final List<StoryNode> nodes;
}

const _languages = {'ja': '🇯🇵 日本語 (Japanese)', 'ko': '🇰🇷 한국어 (Korean)'};
const _levels = ['beginner', 'intermediate', 'advanced'];

/// Create a custom node-based story from a free-text premise. On success it
/// pops with a [CustomStoryResult] holding the title and generated nodes.
class CustomStoryScreen extends StatefulWidget {
  const CustomStoryScreen({super.key});

  @override
  State<CustomStoryScreen> createState() => _CustomStoryScreenState();
}

class _CustomStoryScreenState extends State<CustomStoryScreen> {
  final _premiseCtrl = TextEditingController();
  String _language = 'ja';
  String _level = 'beginner';
  bool _creating = false;
  String? _error;

  @override
  void dispose() {
    _premiseCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final premise = _premiseCtrl.text.trim();
    if (premise.isEmpty) {
      setState(() => _error = 'Describe the story you want to play.');
      return;
    }
    setState(() {
      _creating = true;
      _error = null;
    });
    try {
      final result = await Api.createNodeStory(
        premise: premise,
        language: _language,
        level: _level,
      );
      if (mounted) {
        Navigator.of(context).pop(
          CustomStoryResult(title: result.story.title, nodes: result.nodes),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _creating = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_creating) {
      return const SakuraScaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppColors.purple),
              SizedBox(height: 18),
              Text(
                '✨ Writing your story…',
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

    return SakuraScaffold(
      appBar: AppBar(title: const Text('Create a story')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _label('Language'),
                  _dropdown(
                    value: _language,
                    items: _languages.keys,
                    labelOf: (k) => _languages[k]!,
                    onChanged: (v) => setState(() => _language = v),
                  ),
                  _label('Your level'),
                  _dropdown(
                    value: _level,
                    items: _levels,
                    labelOf: (l) => l[0].toUpperCase() + l.substring(1),
                    onChanged: (v) => setState(() => _level = v),
                  ),
                  _label('Your story idea'),
                  TextField(
                    controller: _premiseCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText:
                          'e.g. I meet a kind barista at a quiet cafe and '
                          'we slowly become friends over a week…',
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: const TextStyle(
                  color: AppColors.errorText,
                  fontSize: 12.5,
                ),
              ),
            ],
            const SizedBox(height: 18),
            GradientButton(
              label: 'Generate story',
              icon: Icons.auto_awesome_rounded,
              onPressed: _create,
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 6, left: 2),
        child: Text(
          text,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            color: AppColors.textHeading,
            fontSize: 13.5,
          ),
        ),
      );

  Widget _dropdown({
    required String value,
    required Iterable<String> items,
    required String Function(String) labelOf,
    required ValueChanged<String> onChanged,
  }) =>
      DropdownButtonFormField<String>(
        value: value,
        isExpanded: true,
        items: items
            .map((e) => DropdownMenuItem(value: e, child: Text(labelOf(e))))
            .toList(),
        onChanged: (v) {
          if (v != null) onChanged(v);
        },
      );
}
