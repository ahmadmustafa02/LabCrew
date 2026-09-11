import 'package:flutter/material.dart';

import '../state/session.dart';
import '../theme/app_theme.dart';

const _demoEmail = 'ayesha.rahman@students.northwater.lab';
const _demoPassword = 'labcrew';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _url = TextEditingController();
  bool _obscure = true;
  bool _showServer = false;

  @override
  void initState() {
    super.initState();
    _url.text = widget.session.api.baseUrl;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _url.dispose();
    super.dispose();
  }

  void _fillDemo() {
    setState(() {
      _email.text = _demoEmail;
      _password.text = _demoPassword;
    });
  }

  Future<void> _submit() async {
    await widget.session.setBaseUrl(_url.text);
    final ok = await widget.session.login(_email.text.trim(), _password.text);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.session.error ?? 'Could not sign in')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    final session = widget.session;
    final ink = Theme.of(context).colorScheme.onSurface;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  'L',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'LabCrew',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.4,
                color: colors.muted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Field',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.w700,
                height: 1.05,
                letterSpacing: -1,
                color: ink,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Collect lab data on your phone. Charts stay private until the cohort is large enough.',
              style: TextStyle(color: colors.muted, height: 1.45, fontSize: 16),
            ),
            const SizedBox(height: 28),
            Text('Email', style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                hintText: 'you@lab.edu',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
            ),
            const SizedBox(height: 16),
            Text('Password', style: TextStyle(fontWeight: FontWeight.w600, color: ink)),
            const SizedBox(height: 8),
            TextField(
              controller: _password,
              obscureText: _obscure,
              autofillHints: const [AutofillHints.password],
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                hintText: 'Your lab password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  tooltip: _obscure ? 'Show password' : 'Hide password',
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _fillDemo,
                child: const Text('Fill demo account'),
              ),
            ),
            TextButton(
              onPressed: () => setState(() => _showServer = !_showServer),
              child: Text(_showServer ? 'Hide server URL' : 'Change server URL'),
            ),
            if (_showServer) ...[
              TextField(
                controller: _url,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(
                  labelText: 'Server URL',
                  hintText: 'http://localhost:3000',
                ),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 8),
            FilledButton(
              onPressed: session.busy ? null : _submit,
              child: session.busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sign in'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: session.busy ? null : () => session.enterDemo(),
              child: const Text('Continue as guest'),
            ),
            const SizedBox(height: 22),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.panel,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('What to type', style: TextStyle(fontWeight: FontWeight.w700, color: ink)),
                  const SizedBox(height: 8),
                  Text(
                    'Email: $_demoEmail\nPassword: $_demoPassword\n\nOr tap Fill demo account, then Sign in.\nNo server? Tap Continue as guest.',
                    style: TextStyle(color: colors.muted, height: 1.45, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
