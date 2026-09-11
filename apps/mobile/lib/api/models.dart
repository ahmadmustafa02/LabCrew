class FieldUser {
  const FieldUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.memberId,
    required this.programName,
    required this.organizationName,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String memberId;
  final String programName;
  final String organizationName;

  bool get isStudent => role == 'student';

  factory FieldUser.fromJson(Map<String, dynamic> json) {
    return FieldUser(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'student',
      memberId: json['memberId'] as String? ?? '',
      programName: json['programName'] as String? ?? '',
      organizationName: json['organizationName'] as String? ??
          json['organizationId'] as String? ??
          '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'memberId': memberId,
        'programName': programName,
        'organizationName': organizationName,
      };
}

class HomePayload {
  const HomePayload({
    required this.headline,
    required this.detail,
    required this.submittedCount,
    required this.milestoneCount,
    required this.openCount,
    required this.streak,
    this.nudgeTitle,
    this.nudgeBody,
    this.nextKind,
    this.nextTitle,
    this.nextReason,
    this.nextAssignmentId,
    required this.tasks,
  });

  final String headline;
  final String detail;
  final int submittedCount;
  final int milestoneCount;
  final int openCount;
  final int streak;
  final String? nudgeTitle;
  final String? nudgeBody;
  final String? nextKind;
  final String? nextTitle;
  final String? nextReason;
  final String? nextAssignmentId;
  final List<FieldTask> tasks;

  factory HomePayload.fromJson(Map<String, dynamic> json) {
    final home = json['home'] as Map<String, dynamic>? ?? json;
    final coach = home['coach'] as Map<String, dynamic>? ?? {};
    final progress = coach['progress'] as Map<String, dynamic>? ?? {};
    final nudge = coach['nudge'] as Map<String, dynamic>?;
    final next = home['nextStep'] as Map<String, dynamic>?;
    final tasks = (home['tasks'] as List<dynamic>? ?? [])
        .map((e) => FieldTask.fromJson(e as Map<String, dynamic>))
        .toList();
    return HomePayload(
      headline: progress['headline'] as String? ?? 'Your week',
      detail: progress['detail'] as String? ?? '',
      submittedCount: (progress['submittedCount'] as num?)?.toInt() ?? 0,
      milestoneCount: (progress['milestoneCount'] as num?)?.toInt() ?? 0,
      openCount: (progress['openCount'] as num?)?.toInt() ?? 0,
      streak: (progress['streak'] as num?)?.toInt() ?? 0,
      nudgeTitle: nudge?['title'] as String?,
      nudgeBody: nudge?['body'] as String?,
      nextKind: next?['kind'] as String?,
      nextTitle: next?['title'] as String?,
      nextReason: next?['reason'] as String?,
      nextAssignmentId: next?['assignmentId'] as String?,
      tasks: tasks,
    );
  }
}

class FieldTask {
  const FieldTask({
    required this.id,
    required this.title,
    required this.status,
    this.dueAt,
    this.submitted = false,
    this.description,
    this.acceptData = false,
    this.requireData = false,
    this.myStatus,
    this.columns = const [],
  });

  final String id;
  final String title;
  final String status;
  final DateTime? dueAt;
  final bool submitted;
  final String? description;
  final bool acceptData;
  final bool requireData;
  final String? myStatus;
  final List<SchemaField> columns;

  bool get isCollect => acceptData || columns.isNotEmpty;

  factory FieldTask.fromJson(Map<String, dynamic> json) {
    final rubric = json['rubric'] as Map<String, dynamic>? ?? {};
    final schema = json['dataSchema'] as Map<String, dynamic>?;
    final cols = (schema?['columns'] as List<dynamic>? ?? [])
        .map((e) => SchemaField.fromJson(e as Map<String, dynamic>))
        .toList();
    return FieldTask(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Assignment',
      status: json['status'] as String? ?? 'ACTIVE',
      dueAt: json['dueAt'] != null ? DateTime.tryParse(json['dueAt'].toString()) : null,
      submitted: json['submitted'] == true ||
          json['myStatus'] == 'SUBMITTED' ||
          json['myStatus'] == 'SCORED',
      description: json['description'] as String? ?? json['instructions'] as String?,
      acceptData: rubric['acceptData'] == true || cols.isNotEmpty,
      requireData: rubric['requireData'] == true,
      myStatus: json['myStatus'] as String?,
      columns: cols,
    );
  }
}

class SchemaField {
  const SchemaField({required this.name, required this.type});

  final String name;
  final String type;

  factory SchemaField.fromJson(Map<String, dynamic> json) {
    return SchemaField(
      name: json['name'] as String? ?? 'value',
      type: json['type'] as String? ?? 'text',
    );
  }
}

class CohortColumn {
  const CohortColumn({
    required this.columnName,
    required this.ownMean,
    required this.ownValues,
    this.cohortMean,
    this.contributorCount = 0,
    this.flaggedCount = 0,
  });

  final String columnName;
  final double? ownMean;
  final List<double> ownValues;
  final double? cohortMean;
  final int contributorCount;
  final int flaggedCount;

  factory CohortColumn.fromJson(Map<String, dynamic> json) {
    final own = json['own'] as Map<String, dynamic>? ?? {};
    final cohort = json['cohort'] as Map<String, dynamic>?;
    final values = (own['values'] as List<dynamic>? ?? [])
        .map((e) => (e as num).toDouble())
        .toList();
    return CohortColumn(
      columnName: json['columnName'] as String? ?? 'value',
      ownMean: (own['mean'] as num?)?.toDouble(),
      ownValues: values,
      cohortMean: (cohort?['mean'] as num?)?.toDouble(),
      contributorCount: (json['contributorCount'] as num?)?.toInt() ?? 0,
      flaggedCount: (own['flaggedCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class OfflineDraft {
  OfflineDraft({
    required this.assignmentId,
    required this.title,
    required this.rows,
    required this.savedAt,
    this.serverUpdatedAt,
  });

  final String assignmentId;
  final String title;
  List<Map<String, String>> rows;
  DateTime savedAt;
  final DateTime? serverUpdatedAt;

  Map<String, dynamic> toJson() => {
        'assignmentId': assignmentId,
        'title': title,
        'rows': rows,
        'savedAt': savedAt.toIso8601String(),
        'serverUpdatedAt': serverUpdatedAt?.toIso8601String(),
      };

  factory OfflineDraft.fromJson(Map<String, dynamic> json) {
    return OfflineDraft(
      assignmentId: json['assignmentId'] as String,
      title: json['title'] as String? ?? 'Draft',
      rows: (json['rows'] as List<dynamic>? ?? [])
          .map((e) => (e as Map<String, dynamic>).map(
                (k, v) => MapEntry(k, v.toString()),
              ))
          .toList(),
      savedAt: DateTime.tryParse(json['savedAt'] as String? ?? '') ?? DateTime.now(),
      serverUpdatedAt: json['serverUpdatedAt'] != null
          ? DateTime.tryParse(json['serverUpdatedAt'] as String)
          : null,
    );
  }
}
