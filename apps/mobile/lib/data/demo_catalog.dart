import '../api/models.dart';

/// Local preview so the Field kit can be shown without a live server.
abstract final class DemoCatalog {
  static FieldUser get user => const FieldUser(
        id: 'demo',
        email: 'ayesha.rahman@students.northwater.lab',
        name: 'Ayesha Rahman',
        role: 'student',
        memberId: 'demo-member',
        programName: 'Summer Research Cohort ’26',
        organizationName: 'Northwater Lab',
      );

  static HomePayload get home => HomePayload(
        headline: '3 in a row turned in',
        detail: 'Keep the rhythm. Next open collection is stream temperature.',
        submittedCount: 3,
        milestoneCount: 4,
        openCount: 1,
        streak: 3,
        nudgeTitle: 'Open the stream log',
        nudgeBody: 'A 4-row collection is enough to see your median against the cohort.',
        nextKind: 'collect',
        nextTitle: 'Stream temperature log',
        nextReason: 'No field rows yet. Log a station before the writeup.',
        nextAssignmentId: 'demo-temp',
        tasks: assignments,
      );

  static List<FieldTask> get assignments => [
        FieldTask(
          id: 'demo-temp',
          title: 'Stream temperature log',
          status: 'ACTIVE',
          dueAt: DateTime.now().add(const Duration(days: 3)),
          submitted: false,
          description: 'Record site, °C, and turbidity at each station.',
          acceptData: true,
          requireData: true,
          columns: const [
            SchemaField(name: 'site', type: 'text'),
            SchemaField(name: 'celsius', type: 'number'),
            SchemaField(name: 'turbidity', type: 'number'),
          ],
        ),
        FieldTask(
          id: 'demo-ph',
          title: 'pH transect',
          status: 'ACTIVE',
          dueAt: DateTime.now().add(const Duration(days: 8)),
          submitted: true,
          acceptData: true,
          columns: const [
            SchemaField(name: 'site', type: 'text'),
            SchemaField(name: 'ph', type: 'number'),
          ],
        ),
      ];

  static List<Map<String, String>> rowsFor(String id) {
    if (id == 'demo-ph') {
      return [
        {'site': 'N1', 'ph': '7.2'},
        {'site': 'N2', 'ph': '6.8'},
        {'site': 'N3', 'ph': '7.4'},
      ];
    }
    return [
      {'site': 'A1', 'celsius': '12.4', 'turbidity': '3.1'},
      {'site': 'A2', 'celsius': '13.1', 'turbidity': '2.8'},
    ];
  }

  static List<CohortColumn> cohortFor(String id) {
    if (id == 'demo-ph') {
      return const [
        CohortColumn(
          columnName: 'ph',
          ownMean: 7.13,
          ownValues: [7.2, 6.8, 7.4],
          cohortMean: 7.05,
          contributorCount: 8,
        ),
      ];
    }
    return const [
      CohortColumn(
        columnName: 'celsius',
        ownMean: 12.75,
        ownValues: [12.4, 13.1],
        cohortMean: 12.4,
        contributorCount: 6,
      ),
      CohortColumn(
        columnName: 'turbidity',
        ownMean: 2.95,
        ownValues: [3.1, 2.8],
        cohortMean: 3.4,
        contributorCount: 6,
      ),
    ];
  }
}
