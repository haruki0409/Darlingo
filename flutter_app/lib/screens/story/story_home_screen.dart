import 'package:flutter/material.dart';

import '../../services/api.dart';
import '../../theme.dart';
import '../onboarding/story_wizard_screen.dart';
import 'chapter_list_screen.dart';

/// Story Mode entry: loads the user's stories. With none, opens the story
/// wizard; otherwise opens the most recent story's chapter list.
class StoryHomeScreen extends StatefulWidget {
  const StoryHomeScreen({super.key});

  @override
  State<StoryHomeScreen> createState() => _StoryHomeScreenState();
}

class _StoryHomeScreenState extends State<StoryHomeScreen> {
  late Future<Widget> _destination;

  @override
  void initState() {
    super.initState();
    _destination = _resolve();
  }

  Future<Widget> _resolve() async {
    final stories = await Api.listStories();
    if (stories.isEmpty) {
      return const StoryWizardScreen();
    }
    final (story, chapters) = await Api.getStory(stories.first.id);
    return ChapterListScreen(story: story, chapters: chapters);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Widget>(
      future: _destination,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SakuraScaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppColors.purple),
                  SizedBox(height: 16),
                  Text(
                    '두근두근 ・ ドキドキ',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          );
        }
        if (snapshot.hasError) {
          return SakuraScaffold(
            appBar: AppBar(),
            body: SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: GlassCard(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Something went wrong',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppColors.textHeading,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${snapshot.error}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 18),
                        GradientButton(
                          label: 'Retry',
                          icon: Icons.refresh_rounded,
                          onPressed: () =>
                              setState(() => _destination = _resolve()),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        return snapshot.data!;
      },
    );
  }
}
