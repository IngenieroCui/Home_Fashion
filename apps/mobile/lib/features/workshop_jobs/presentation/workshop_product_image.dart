import 'package:flutter/material.dart';

class WorkshopProductImage extends StatelessWidget {
  const WorkshopProductImage({required this.url, this.height = 150, super.key});
  final String? url;
  final double height;

  @override
  Widget build(BuildContext context) {
    Widget fallback = Container(
      height: height, alignment: Alignment.center,
      decoration: BoxDecoration(color: const Color(0xFFECE5D9), borderRadius: BorderRadius.circular(14)),
      child: const Icon(Icons.chair_alt_outlined, size: 42, color: Color(0xFF746657)),
    );
    if (url == null || url!.isEmpty) return fallback;
    return ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.network(url!, height: height, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback));
  }
}
