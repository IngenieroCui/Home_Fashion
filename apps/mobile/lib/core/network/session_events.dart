import 'dart:async';

class SessionEvents {
  final _expiredController = StreamController<void>.broadcast();

  Stream<void> get expired => _expiredController.stream;

  void notifyExpired() {
    if (!_expiredController.isClosed) _expiredController.add(null);
  }

  Future<void> close() => _expiredController.close();
}
