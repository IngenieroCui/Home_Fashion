import 'package:flutter/material.dart';

class WorkshopProductImage extends StatelessWidget {
  const WorkshopProductImage({required this.url, this.height = 150, super.key});
  final String? url;
  final double height;

  @override
  Widget build(BuildContext context) {
    Widget fallback = Container(
      height: height,
      alignment: Alignment.center,
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(14)),
      child: Icon(Icons.chair_alt_outlined,
          size: 42, color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
    if (url == null || url!.isEmpty) return fallback;
    return ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Image.network(url!,
            height: height,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => fallback));
  }
}
