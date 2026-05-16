import 'package:flutter/material.dart';

import '../../models/partner.dart';
import '../../services/api.dart';
import '../../theme.dart';
import '../story/chapter_list_screen.dart';

const _languages = {'ko': '🇰🇷 한국어 (Korean)', 'ja': '🇯🇵 日本語 (Japanese)'};
const _levels = ['beginner', 'intermediate', 'advanced'];
const _genres = [
  'slice-of-life',
  'romance',
  'mystery',
  'adventure',
  'school-life',
  'fantasy',
];
const _tones = ['wholesome', 'heartwarming', 'comedic', 'dramatic', 'exciting'];

/// Onboarding wizard: the user customizes a story, then the backend generates
/// it (title, premise, chapters) via AI.
class StoryWizardScreen extends StatefulWidget {
  const StoryWizardScreen({super.key});

  @override
  State<StoryWizardScreen> createState() => _StoryWizardScreenState();
}

class _StoryWizardScreenState extends State<StoryWizardScreen> {
  String _language = 'ko';
  String _level = 'beginner';
  String _genre = _genres.first;
  String _tone = _tones.first;
  int _chapterCount = 5;
  final _settingCtrl = TextEditingController();
  final _premiseCtrl = TextEditingController();

  List<Partner> _partners = [];
  Partner? _partner;
  bool _loadingPartners = true;
  bool _creating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPartners();
  }

  @override
  void dispose() {
    _settingCtrl.dispose();
    _premiseCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadPartners() async {
    try {
      final partners = await Api.listPartners();
      setState(() {
        _partners = partners;
        _loadingPartners = false;
        _syncPartnerToLanguage();
      });
    } catch (e) {
      setState(() {
        _loadingPartners = false;
        _error = '$e';
      });
    }
  }

  /// Partners are language-specific — only show those matching the choice.
  List<Partner> get _partnersForLanguage =>
      _partners.where((p) => p.language == _language).toList();

  void _syncPartnerToLanguage() {
    final options = _partnersForLanguage;
    if (options.isEmpty) {
      _partner = null;
    } else if (_partner == null || !options.contains(_partner)) {
      _partner = options.first;
    }
  }

  Future<void> _createStory() async {
    if (_partner == null) {
      setState(() => _error = 'No partner available for this language.');
      return;
    }
    if (_settingCtrl.text.trim().isEmpty || _premiseCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Please fill in the setting and your story idea.');
      return;
    }
    setState(() {
      _creating = true;
      _error = null;
    });
    try {
      final (story, chapters) = await Api.createStory(
        partnerId: _partner!.id,
        genre: _genre,
        tone: _tone,
        setting: _settingCtrl.text.trim(),
        premise: _premiseCtrl.text.trim(),
        language: _language,
        level: _level,
        totalChapters: _chapterCount,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ChapterListScreen(story: story, chapters: chapters),
        ),
      );
    } catch (e) {
      setState(() {
        _creating = false;
        _error = '$e';
      });
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
      appBar: AppBar(title: const Text('Create your story')),
      body: SafeArea(
        child: _loadingPartners
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.purple),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  const Text(
                    '두근두근 새 이야기 ・ 新しい物語',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 14),
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SectionLabel('Language'),
                        _dropdown<String>(
                          value: _language,
                          items: _languages.keys,
                          labelOf: (k) => _languages[k]!,
                          onChanged: (v) => setState(() {
                            _language = v;
                            _syncPartnerToLanguage();
                          }),
                        ),
                        const SectionLabel('Your level'),
                        _dropdown<String>(
                          value: _level,
                          items: _levels,
                          labelOf: _titleCase,
                          onChanged: (v) => setState(() => _level = v),
                        ),
                        const SectionLabel('Partner'),
                        _dropdown<Partner>(
                          key: ValueKey('partner-$_language'),
                          value: _partner,
                          items: _partnersForLanguage,
                          labelOf: (p) => p.name,
                          onChanged: (v) => setState(() => _partner = v),
                        ),
                        const SectionLabel('Genre'),
                        _dropdown<String>(
                          value: _genre,
                          items: _genres,
                          labelOf: _titleCase,
                          onChanged: (v) => setState(() => _genre = v),
                        ),
                        const SectionLabel('Tone'),
                        _dropdown<String>(
                          value: _tone,
                          items: _tones,
                          labelOf: _titleCase,
                          onChanged: (v) => setState(() => _tone = v),
                        ),
                        const SectionLabel('Setting'),
                        TextField(
                          controller: _settingCtrl,
                          decoration: const InputDecoration(
                            hintText: 'e.g. a quiet seaside town in Korea',
                          ),
                        ),
                        const SectionLabel('Your story idea'),
                        TextField(
                          controller: _premiseCtrl,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            hintText:
                                'Describe the story you want to play through…',
                          ),
                        ),
                        SectionLabel('Chapters: $_chapterCount'),
                        Slider(
                          value: _chapterCount.toDouble(),
                          min: 3,
                          max: 8,
                          divisions: 5,
                          label: '$_chapterCount',
                          activeColor: AppColors.purple,
                          onChanged: (v) =>
                              setState(() => _chapterCount = v.round()),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _errorBox(_error!),
                  ],
                  const SizedBox(height: 18),
                  GradientButton(
                    label: 'Generate story',
                    icon: Icons.auto_awesome_rounded,
                    onPressed: _partner == null ? null : _createStory,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _errorBox(String message) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.errorBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message,
          style: const TextStyle(
            color: AppColors.errorText,
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
          ),
        ),
      );

  Widget _dropdown<T>({
    Key? key,
    required T? value,
    required Iterable<T> items,
    required String Function(T) labelOf,
    required ValueChanged<T> onChanged,
  }) =>
      DropdownButtonFormField<T>(
        key: key,
        value: value,
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
