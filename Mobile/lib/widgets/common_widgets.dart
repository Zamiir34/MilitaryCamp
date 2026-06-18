// lib/widgets/common_widgets.dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LoadingOverlay extends StatelessWidget {
  final bool isLoading; final Widget child;
  const LoadingOverlay({super.key, required this.isLoading, required this.child});
  @override Widget build(BuildContext context) => Stack(children: [
    child,
    if (isLoading) Container(
      color: Colors.black.withOpacity(0.4),
      child: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
    ),
  ]);
}

class MilitaryDivider extends StatelessWidget {
  const MilitaryDivider({super.key});
  @override Widget build(BuildContext context) => Container(
    height: 1, margin: const EdgeInsets.symmetric(vertical: 12),
    color: AppColors.border,
  );
}

class SectionHeader extends StatelessWidget {
  final String title; final Widget? trailing;
  const SectionHeader({super.key, required this.title, this.trailing});
  @override Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: Text(title, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 2, fontWeight: FontWeight.w600))),
      if (trailing != null) trailing!,
    ],
  );
}

class EmptyState extends StatelessWidget {
  final IconData icon; final String message; final String? subMessage;
  const EmptyState({super.key, required this.icon, required this.message, this.subMessage});
  @override Widget build(BuildContext context) => Center(child: Column(
    mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(icon, size: 56, color: AppColors.textMuted),
      const SizedBox(height: 12),
      Text(message, style: const TextStyle(color: AppColors.textMuted, fontSize: 16, fontWeight: FontWeight.w600)),
      if (subMessage != null) ...[
        const SizedBox(height: 6),
        Text(subMessage!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ],
    ],
  ));
}

class StatusChip extends StatelessWidget {
  final String label; final Color color;
  const StatusChip({super.key, required this.label, required this.color});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
  );
}

class InfoRow extends StatelessWidget {
  final String label, value; final bool mono;
  const InfoRow({super.key, required this.label, required this.value, this.mono = false});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 130, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
      Expanded(child: Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500, fontFamily: mono ? 'monospace' : null))),
    ]),
  );
}
