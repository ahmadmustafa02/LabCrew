import 'package:flutter/material.dart';

import '../api/models.dart';
import '../state/session.dart';
import 'collect_form_screen.dart';
import 'collect_screen.dart';
import 'home_screen.dart';
import 'insights_screen.dart';
import 'you_screen.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;

  Future<void> _openTask(FieldTask task) async {
    if (!task.isCollect) return;
    final submitted = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => CollectFormScreen(session: widget.session, task: task),
      ),
    );
    if (submitted == true && mounted) {
      setState(() => _index = 2);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        session: widget.session,
        onOpenCollect: () => setState(() => _index = 1),
        onOpenTask: _openTask,
      ),
      CollectScreen(session: widget.session, onOpenTask: _openTask),
      InsightsScreen(session: widget.session),
      YouScreen(session: widget.session),
    ];

    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: KeyedSubtree(
            key: ValueKey(_index),
            child: pages[_index],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.science_outlined),
            selectedIcon: Icon(Icons.science_rounded),
            label: 'Collect',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights_rounded),
            label: 'Insights',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'You',
          ),
        ],
      ),
    );
  }
}
