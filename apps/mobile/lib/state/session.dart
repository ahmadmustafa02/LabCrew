import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../data/demo_catalog.dart';
import '../data/offline_queue.dart';

class SessionController extends ChangeNotifier {
  SessionController();

  static const _themeKey = 'labcrew.field.theme';
  static const _urlKey = 'labcrew.field.baseUrl';
  static const _userKey = 'labcrew.field.user';
  static const _demoKey = 'labcrew.field.demo';

  final _secure = const FlutterSecureStorage();
  final _queue = OfflineQueue();
  final api = ApiClient(baseUrl: defaultBaseUrl());

  FieldUser? user;
  bool ready = false;
  bool demoMode = false;
  bool busy = false;
  String? error;
  ThemeModePref theme = ThemeModePref.system;
  HomePayload? home;
  List<FieldTask> tasks = [];
  Map<String, OfflineDraft> drafts = {};
  bool online = true;
  String? lastInsightTaskId;
  List<Map<String, String>> lastSubmittedRows = [];

  List<FieldTask> get collectTasks =>
      tasks.where((task) => task.isCollect).toList();

  static String defaultBaseUrl() {
    if (kIsWeb) return 'http://localhost:3000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  Future<void> bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      theme = ThemeModePref.fromName(prefs.getString(_themeKey));
      api.baseUrl = prefs.getString(_urlKey) ?? defaultBaseUrl();
      demoMode = prefs.getBool(_demoKey) ?? false;
      drafts = await _queue.load();
      api.token = await _secure.read(key: 'labcrew.field.token');
      final rawUser = prefs.getString(_userKey);
      if (rawUser != null) {
        user = FieldUser.fromJson(jsonDecode(rawUser) as Map<String, dynamic>);
      }
      if (demoMode) {
        _applyDemo();
      } else if (api.token != null && user != null) {
        try {
          await refresh();
        } catch (_) {
          /* keep cached user; screens will retry */
        }
      }
    } catch (_) {
      api.baseUrl = defaultBaseUrl();
    }
    ready = true;
    notifyListeners();
  }

  Future<void> setBaseUrl(String url) async {
    api.baseUrl = url.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_urlKey, api.baseUrl);
    notifyListeners();
  }

  Future<void> setTheme(ThemeModePref next) async {
    theme = next;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeKey, next.name);
    notifyListeners();
  }

  Future<void> enterDemo() async {
    demoMode = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_demoKey, true);
    _applyDemo();
    notifyListeners();
  }

  void _applyDemo() {
    user = DemoCatalog.user;
    home = DemoCatalog.home;
    tasks = DemoCatalog.assignments;
  }

  Future<bool> login(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final result = await api.login(
        email: email,
        password: password,
        deviceName: 'LabCrew Field',
      );
      api.token = result.token;
      user = result.user;
      demoMode = false;
      await _secure.write(key: 'labcrew.field.token', value: result.token);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userKey, jsonEncode(result.user.toJson()));
      await prefs.setBool(_demoKey, false);
      await refresh();
      busy = false;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    home = null;
    tasks = [];
    demoMode = false;
    await _secure.delete(key: 'labcrew.field.token');
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.setBool(_demoKey, false);
    notifyListeners();
  }

  Future<void> refresh() async {
    if (demoMode) {
      _applyDemo();
      notifyListeners();
      return;
    }
    home = await api.home();
    tasks = await api.assignments();
    notifyListeners();
  }

  Future<void> saveDraft(OfflineDraft draft) async {
    draft.savedAt = DateTime.now();
    drafts[draft.assignmentId] = draft;
    await _queue.save(drafts);
    notifyListeners();
  }

  Future<void> clearDraft(String assignmentId) async {
    drafts.remove(assignmentId);
    await _queue.save(drafts);
    notifyListeners();
  }

  Future<String?> submit({
    required FieldTask task,
    required List<Map<String, String>> rows,
    required bool asDraft,
    required bool keepMine,
    DateTime? serverUpdatedAt,
  }) async {
    final local = drafts[task.id];
    if (!keepMine &&
        local != null &&
        serverUpdatedAt != null &&
        local.serverUpdatedAt != null &&
        serverUpdatedAt.isAfter(local.serverUpdatedAt!) &&
        !_sameRows(local.rows, rows)) {
      return 'conflict';
    }

    if (demoMode) {
      await saveDraft(OfflineDraft(
        assignmentId: task.id,
        title: task.title,
        rows: rows,
        savedAt: DateTime.now(),
        serverUpdatedAt: DateTime.now(),
      ));
      if (!asDraft) {
        lastInsightTaskId = task.id;
        lastSubmittedRows = rows;
      }
      return null;
    }

    try {
      await api.submitRows(assignmentId: task.id, rows: rows, asDraft: asDraft);
      await clearDraft(task.id);
      await refresh();
      if (!asDraft) {
        lastInsightTaskId = task.id;
        lastSubmittedRows = rows;
      }
      return null;
    } catch (_) {
      await saveDraft(OfflineDraft(
        assignmentId: task.id,
        title: task.title,
        rows: rows,
        savedAt: DateTime.now(),
        serverUpdatedAt: serverUpdatedAt,
      ));
      return 'queued';
    }
  }

  Future<List<CohortColumn>> cohort(FieldTask task) async {
    if (demoMode) {
      final demo = DemoCatalog.cohortFor(task.id);
      if (lastInsightTaskId == task.id && lastSubmittedRows.isNotEmpty) {
        return _mergeOwnRows(demo, lastSubmittedRows);
      }
      return demo;
    }
    try {
      final remote = await api.cohort(task.id);
      if (remote.any((c) => c.ownValues.isNotEmpty || c.ownMean != null)) {
        return remote;
      }
    } catch (_) {
      /* fall through to local rows */
    }
    final loaded = await loadRows(task);
    final rows = loaded.rows.isNotEmpty ? loaded.rows : lastSubmittedRows;
    return _columnsFromRows(task, rows);
  }

  List<CohortColumn> _mergeOwnRows(
    List<CohortColumn> base,
    List<Map<String, String>> rows,
  ) {
    final fromRows = _columnsFromRows(
      FieldTask(
        id: lastInsightTaskId ?? 'local',
        title: 'local',
        status: 'ACTIVE',
        columns: [
          for (final col in base) SchemaField(name: col.columnName, type: 'number'),
        ],
      ),
      rows,
    );
    if (fromRows.isEmpty) return base;
    return [
      for (final col in base)
        CohortColumn(
          columnName: col.columnName,
          ownMean: fromRows
              .where((c) => c.columnName == col.columnName)
              .map((c) => c.ownMean)
              .firstWhere((v) => v != null, orElse: () => col.ownMean),
          ownValues: fromRows
              .where((c) => c.columnName == col.columnName)
              .expand((c) => c.ownValues)
              .toList(),
          cohortMean: col.cohortMean,
          contributorCount: col.contributorCount,
          flaggedCount: col.flaggedCount,
        ),
    ];
  }

  List<CohortColumn> _columnsFromRows(
    FieldTask task,
    List<Map<String, String>> rows,
  ) {
    final numeric = task.columns.where((c) => c.type == 'number').toList();
    final names = numeric.isNotEmpty
        ? numeric.map((c) => c.name).toList()
        : rows
            .expand((row) => row.entries)
            .where((e) => double.tryParse(e.value) != null)
            .map((e) => e.key)
            .toSet()
            .toList();
    return [
      for (final name in names)
        () {
          final values = rows
              .map((row) => double.tryParse(row[name] ?? ''))
              .whereType<double>()
              .toList();
          final mean = values.isEmpty
              ? null
              : values.reduce((a, b) => a + b) / values.length;
          return CohortColumn(
            columnName: name,
            ownMean: mean,
            ownValues: values,
          );
        }(),
    ];
  }

  Future<({List<Map<String, String>> rows, DateTime? updatedAt})> loadRows(
    FieldTask task,
  ) async {
    final draft = drafts[task.id];
    if (demoMode) {
      return (rows: draft?.rows ?? DemoCatalog.rowsFor(task.id), updatedAt: draft?.savedAt);
    }
    try {
      final remote = await api.submission(task.id);
      if (draft != null &&
          remote.updatedAt != null &&
          draft.savedAt.isAfter(remote.updatedAt!) &&
          !_sameRows(draft.rows, remote.rows)) {
        return (rows: draft.rows, updatedAt: remote.updatedAt);
      }
      return (rows: remote.rows.isEmpty ? (draft?.rows ?? []) : remote.rows, updatedAt: remote.updatedAt);
    } catch (_) {
      return (rows: draft?.rows ?? [], updatedAt: draft?.savedAt);
    }
  }

  bool _sameRows(List<Map<String, String>> a, List<Map<String, String>> b) {
    return jsonEncode(a) == jsonEncode(b);
  }
}

enum ThemeModePref {
  system,
  light,
  dark;

  static ThemeModePref fromName(String? name) {
    return ThemeModePref.values.firstWhere(
      (e) => e.name == name,
      orElse: () => ThemeModePref.system,
    );
  }
}
