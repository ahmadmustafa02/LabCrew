import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'screens/shell_screen.dart';
import 'state/session.dart';
import 'theme/app_theme.dart';
import 'widgets/phone_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LabCrewFieldApp());
}

class LabCrewFieldApp extends StatefulWidget {
  const LabCrewFieldApp({super.key});

  @override
  State<LabCrewFieldApp> createState() => _LabCrewFieldAppState();
}

class _LabCrewFieldAppState extends State<LabCrewFieldApp> {
  final SessionController session = SessionController();

  @override
  void initState() {
    super.initState();
    session.addListener(_onSession);
    session.bootstrap();
  }

  void _onSession() => setState(() {});

  @override
  void dispose() {
    session.removeListener(_onSession);
    session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mode = switch (session.theme) {
      ThemeModePref.light => ThemeMode.light,
      ThemeModePref.dark => ThemeMode.dark,
      ThemeModePref.system => ThemeMode.system,
    };

    return MaterialApp(
      title: 'LabCrew Field',
      debugShowCheckedModeBanner: false,
      theme: LcTheme.light(),
      darkTheme: LcTheme.dark(),
      themeMode: mode == ThemeMode.system ? ThemeMode.dark : mode,
      builder: (context, child) => PhoneShell(child: child ?? const SizedBox.shrink()),
      home: !session.ready
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : session.user == null
              ? LoginScreen(session: session)
              : ShellScreen(session: session),
    );
  }
}
