import 'package:flutter/material.dart';

import '../api/models.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/lc_widgets.dart';

class CollectFormScreen extends StatefulWidget {
  const CollectFormScreen({
    super.key,
    required this.session,
    required this.task,
  });

  final SessionController session;
  final FieldTask task;

  @override
  State<CollectFormScreen> createState() => _CollectFormScreenState();
}

class _CollectFormScreenState extends State<CollectFormScreen> {
  late List<Map<String, String>> _rows;
  DateTime? _serverUpdatedAt;
  bool _loading = true;
  bool _saving = false;

  List<SchemaField> get _cols {
    if (widget.task.columns.isNotEmpty) return widget.task.columns;
    return const [SchemaField(name: 'note', type: 'text')];
  }

  @override
  void initState() {
    super.initState();
    _rows = [];
    _load();
  }

  Future<void> _load() async {
    final loaded = await widget.session.loadRows(widget.task);
    if (!mounted) return;
    setState(() {
      _rows = loaded.rows.isEmpty
          ? [_blank()]
          : loaded.rows.map((e) => Map<String, String>.from(e)).toList();
      _serverUpdatedAt = loaded.updatedAt;
      _loading = false;
    });
  }

  Map<String, String> _blank() => {for (final c in _cols) c.name: ''};

  Future<void> _persistLocal() async {
    await widget.session.saveDraft(OfflineDraft(
      assignmentId: widget.task.id,
      title: widget.task.title,
      rows: _rows,
      savedAt: DateTime.now(),
      serverUpdatedAt: _serverUpdatedAt,
    ));
  }

  Future<void> _send({required bool draft, bool keepMine = false}) async {
    setState(() => _saving = true);
    final cleaned = _rows
        .map((row) => row.map((k, v) => MapEntry(k, v.trim())))
        .where((row) => row.values.any((v) => v.isNotEmpty))
        .toList();
    if (cleaned.isEmpty && !draft) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one row before submitting.')),
      );
      return;
    }
    final result = await widget.session.submit(
      task: widget.task,
      rows: cleaned,
      asDraft: draft,
      keepMine: keepMine,
      serverUpdatedAt: _serverUpdatedAt,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (result == 'conflict') {
      final choice = await showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        builder: (ctx) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This assignment changed on the server',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your phone draft was not discarded. Keep yours, or open what the lab already has.',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, 'mine'),
                child: const Text('Keep mine'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(ctx, 'theirs'),
                child: const Text('View theirs'),
              ),
            ],
          ),
        ),
      );
      if (choice == 'mine') {
        await _send(draft: draft, keepMine: true);
      } else if (choice == 'theirs') {
        await widget.session.clearDraft(widget.task.id);
        await _load();
      }
      return;
    }
    final message = switch (result) {
      'queued' => 'Saved on this phone. It will send when the server is reachable.',
      _ => draft ? 'Draft saved.' : 'Submitted to the lab.',
    };
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    if (result == null && !draft && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.task.title)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
              children: [
                Text(
                  widget.task.requireData
                      ? 'At least one row is required to turn this in.'
                      : 'Rows validate against the assignment schema.',
                  style: TextStyle(color: colors.muted, height: 1.45),
                ),
                const SizedBox(height: 16),
                for (var i = 0; i < _rows.length; i++)
                  _RowEditor(
                    key: ValueKey('row-$i-${_rows.length}'),
                    index: i,
                    columns: _cols,
                    values: _rows[i],
                    canRemove: _rows.length > 1,
                    onChanged: (next) => _rows[i] = next,
                    onRemove: () => setState(() => _rows.removeAt(i)),
                  ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => setState(() => _rows.add(_blank())),
                  icon: const Icon(Icons.add),
                  label: const Text('Add row'),
                ),
              ],
            ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving
                      ? null
                      : () async {
                          await _persistLocal();
                          await _send(draft: true);
                        },
                  child: const Text('Save draft'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : () => _send(draft: false),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Submit'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RowEditor extends StatefulWidget {
  const _RowEditor({
    super.key,
    required this.index,
    required this.columns,
    required this.values,
    required this.canRemove,
    required this.onChanged,
    required this.onRemove,
  });

  final int index;
  final List<SchemaField> columns;
  final Map<String, String> values;
  final bool canRemove;
  final ValueChanged<Map<String, String>> onChanged;
  final VoidCallback onRemove;

  @override
  State<_RowEditor> createState() => _RowEditorState();
}

class _RowEditorState extends State<_RowEditor> {
  late final Map<String, TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final col in widget.columns)
        col.name: TextEditingController(text: widget.values[col.name] ?? ''),
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _emit() {
    widget.onChanged({
      for (final e in _controllers.entries) e.key: e.value.text,
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = LcColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LcCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Row ${widget.index + 1}', style: const TextStyle(fontWeight: FontWeight.w700)),
                const Spacer(),
                if (widget.canRemove)
                  IconButton(
                    tooltip: 'Remove row',
                    onPressed: widget.onRemove,
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            for (final col in widget.columns) ...[
              Text(
                col.name,
                style: TextStyle(color: colors.muted, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _controllers[col.name],
                keyboardType: col.type == 'number'
                    ? const TextInputType.numberWithOptions(decimal: true, signed: true)
                    : TextInputType.text,
                onChanged: (_) => _emit(),
                decoration: InputDecoration(hintText: col.type == 'number' ? '0.0' : 'Value'),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}
