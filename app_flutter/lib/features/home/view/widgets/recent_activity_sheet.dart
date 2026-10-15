import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/money.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/skeleton.dart';
import '../../domain/home_models.dart';

/// Hoja clara inferior (Zona C): últimos movimientos + un hijo embebido (mood).
class RecentActivitySheet extends StatelessWidget {
  const RecentActivitySheet({
    super.key,
    required this.transactions,
    required this.loading,
    required this.onSeeAll,
    required this.onOpen,
    required this.onRegister,
    required this.child,
  });

  final List<TransactionRow> transactions;
  final bool loading;
  final VoidCallback onSeeAll;
  final ValueChanged<TransactionRow> onOpen;
  final VoidCallback onRegister;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(space(5)),
      decoration: const BoxDecoration(
        color: AppColors.offWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
        boxShadow: AppShadows.sheet,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Últimos movimientos', style: AppTextStyles.h2(AppColors.ink)),
              PressableScale(
                onTap: onSeeAll,
                scale: 0.97,
                semanticLabel: 'Ver todos los movimientos',
                child: Padding(
                  padding: EdgeInsets.all(space(1)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Ver todos',
                          style: AppTextStyles.small(AppColors.turquoiseDark)
                              .copyWith(fontWeight: FontWeight.w700)),
                      const Icon(Icons.chevron_right,
                          size: 16, color: AppColors.turquoiseDark),
                    ],
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: space(4)),
          if (loading)
            _loadingList()
          else if (transactions.isEmpty)
            _emptyState()
          else
            _list(),
          SizedBox(height: space(6)),
          child,
        ],
      ),
    );
  }

  Widget _loadingList() => Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: EdgeInsets.symmetric(vertical: space(2)),
              child: Row(
                children: [
                  const SkeletonBox(width: 44, height: 44, radius: 22, onDark: false),
                  SizedBox(width: space(3)),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FractionallySizedBox(
                          widthFactor: 0.55,
                          alignment: Alignment.centerLeft,
                          child: SkeletonBox(height: 14, onDark: false),
                        ),
                        SizedBox(height: 8),
                        FractionallySizedBox(
                          widthFactor: 0.35,
                          alignment: Alignment.centerLeft,
                          child: SkeletonBox(height: 11, onDark: false),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: space(3)),
                  const SkeletonBox(width: 82, height: 16, onDark: false),
                ],
              ),
            ),
        ],
      );

  Widget _list() => Column(
        children: [
          for (var i = 0; i < transactions.length; i++) ...[
            if (i > 0)
              Divider(height: 1, thickness: 1, color: AppColors.borderLight),
            _row(transactions[i]),
          ],
        ],
      );

  Widget _row(TransactionRow tx) {
    final isIncome = tx.type == TxType.income;
    final isNeutral =
        tx.type == TxType.goalDeposit || tx.type == TxType.transfer;
    final amountColor = isIncome
        ? AppColors.turquoiseDark
        : isNeutral
            ? AppColors.ink
            : AppColors.coralAccessible;
    final iconBg = isIncome
        ? AppColors.paleTurquoise
        : isNeutral
            ? AppColors.paleYellow
            : AppColors.paleCoral;
    final iconColor = isIncome
        ? AppColors.turquoiseDark
        : isNeutral
            ? const Color(0xFFB8880A)
            : AppColors.coralAccessible;

    return PressableScale(
      onTap: () => onOpen(tx),
      scale: 0.99,
      borderRadius: BorderRadius.circular(12),
      semanticLabel: '${_title(tx)}, ${money(tx.amountCents)}',
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: space(3.5), horizontal: space(2)),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
              child: Icon(_iconFor(tx), size: 20, color: iconColor),
            ),
            SizedBox(width: space(3)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_title(tx),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.small(AppColors.ink)
                          .copyWith(fontWeight: FontWeight.w700)),
                  Text(_subtitle(tx),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.tiny(AppColors.mutedDark)
                          .copyWith(fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            SizedBox(width: space(2)),
            Text(
              moneySigned(tx.amountCents,
                  isIncome: isIncome, isNeutral: isNeutral),
              style: AppTextStyles.amount(amountColor),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() => Padding(
        padding: EdgeInsets.symmetric(vertical: space(8)),
        child: Column(
          children: [
            Text('Aún no tienes movimientos registrados',
                textAlign: TextAlign.center,
                style: AppTextStyles.small(AppColors.ink)
                    .copyWith(fontWeight: FontWeight.w700)),
            SizedBox(height: space(1)),
            Text('Registra tu primer ingreso o gasto para comenzar.',
                textAlign: TextAlign.center,
                style: AppTextStyles.tiny(AppColors.mutedDark)
                    .copyWith(fontWeight: FontWeight.w500)),
            SizedBox(height: space(3)),
            PressableScale(
              onTap: onRegister,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              semanticLabel: 'Registrar movimiento',
              child: Container(
                height: AppTouch.minTarget,
                padding: EdgeInsets.symmetric(horizontal: space(5)),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.turquoiseDark,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text('Registrar movimiento',
                    style: AppTextStyles.small(AppColors.white)
                        .copyWith(fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      );

  String _title(TransactionRow tx) {
    if (tx.type == TxType.debtPayment) return tx.debtName ?? 'Abono a deuda';
    if (tx.type == TxType.goalDeposit) {
      return (tx.note?.isNotEmpty ?? false) ? tx.note! : 'Aporte a meta';
    }
    if (tx.type == TxType.transfer) return 'Traslado entre cuentas';
    if (tx.note?.isNotEmpty ?? false) return tx.note!;
    if (tx.categoryName?.isNotEmpty ?? false) return tx.categoryName!;
    return tx.type == TxType.income ? 'Ingreso' : 'Gasto';
  }

  String _subtitle(TransactionRow tx) {
    final kind = switch (tx.type) {
      TxType.income => 'Ingreso',
      TxType.transfer => 'Traslado',
      TxType.debtPayment => 'Abono',
      TxType.goalDeposit => 'Ahorro',
      TxType.expense => 'Gasto',
    };
    return '$kind · ${tx.accountName}';
  }

  IconData _iconFor(TransactionRow tx) {
    if (tx.type == TxType.income) return Icons.south_rounded;
    if (tx.type == TxType.debtPayment) return Icons.credit_card;
    if (tx.type == TxType.goalDeposit) return Icons.savings_outlined;
    final n = (tx.categoryName ?? '').toLowerCase();
    if (n.contains('mercado') || n.contains('compra')) {
      return Icons.shopping_cart_outlined;
    }
    if (n.contains('transporte')) return Icons.directions_bus_outlined;
    if (n.contains('comida') || n.contains('restaurante')) {
      return Icons.restaurant_outlined;
    }
    if (n.contains('servicio') || n.contains('luz')) return Icons.bolt_outlined;
    if (n.contains('arriendo') || n.contains('casa')) return Icons.home_outlined;
    return Icons.north_rounded;
  }
}
