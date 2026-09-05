import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef RequestHandler = Future<ResponseBody> Function(RequestOptions options);

class RecordingAdapter implements HttpClientAdapter {
  RecordingAdapter(this.handler);

  final RequestHandler handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    requests.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonResponse(int statusCode, Object? body) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}
