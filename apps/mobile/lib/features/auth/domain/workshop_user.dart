import '../../../core/errors/app_exception.dart';

class WorkshopUser {
  const WorkshopUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    this.permissions = const [],
  });

  factory WorkshopUser.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final fullName = json['fullName'];
    final email = json['email'];
    final role = json['role'];
    final rawPermissions = json['permissions'];
    if ((id is! String && id is! num) ||
        fullName is! String ||
        email is! String ||
        role is! String ||
        (rawPermissions != null && rawPermissions is! List<dynamic>)) {
      throw const InvalidResponseException();
    }
    return WorkshopUser(
      id: id.toString(),
      fullName: fullName,
      email: email,
      role: role,
      permissions: rawPermissions == null
          ? const []
          : rawPermissions.whereType<String>().toList(growable: false),
    );
  }

  final String id;
  final String fullName;
  final String email;
  final String role;
  final List<String> permissions;

  bool get isWorkshop => role == 'WORKSHOP';
}
