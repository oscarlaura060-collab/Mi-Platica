import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimens.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/money.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/skeleton.dart';
import '../../domain/home_models.dart';

class AccountsCarousel extends StatelessWidget {
  const AccountsCarousel({
    super.key,
    required this.accounts,
    required this.loading,
    required this.primaryId,
    required this.onSeeAll,
    required this.onOpen,
    required this.onCreate,
  });

  final List<AccountBalance> accounts;
  final bool loading;
  final int? primaryId;
  final VoidCallback onSeeAll;
  final ValueChanged<AccountBalance> onOpen;
  final VoidCallback onCreate;

  static const _cardWidth = 256.0;
  static const _cardHeight = 96.0;

  @override
  Widget build(BuildContext context) {
    final hasFixedHeight = loading || accounts.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(),
        SizedBox(height: space(3)),
        if (hasFixedHeight)
          SizedBox(height: _cardHeight, child: _body())
        else
          _body(),
      ],
    );
  }

  Widget _sectionHeader() => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Mis cuentas', style: AppTextStyles.h3(AppColors.white)),
          PressableScale(
            onTap: onSeeAll,
            scale: 0.97,
            semanticLabel: 'Ver todas las cuentas',
            child: Padding(
              padding: EdgeInsets.all(space(1)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Ver todas',
                      style: AppTextStyles.small(AppColors.mutedLight)
                          .copyWith(fontWeight: FontWeight.w700)),
                  const Icon(Icons.chevron_right,
                      size: 16, color: AppColors.mutedLight),
                ],
              ),
            ),
          ),
        ],
      );

  Widget _body() {
    if (loading) {
      return Row(
        children: const [
          Expanded(flex: 3, child: SkeletonBox(height: _cardHeight, radius: 20)),
          SizedBox(width: 12),
          Expanded(flex: 1, child: SkeletonBox(height: _cardHeight, radius: 20)),
        ],
      );
    }
    if (accounts.isEmpty) return _emptyState();

    return ListView.separated(
      scrollDirection: Axis.horizontal,
      clipBehavior: Clip.none,
      physics: const BouncingScrollPhysics(),
      itemCount: accounts.length,
      separatorBuilder: (_, __) => SizedBox(width: space(3)),
      itemBuilder: (_, i) => _accountCard(accounts[i], i),
    );
  }

  Widget _accountCard(AccountBalance a, int index) {
    final isCard = a.type == AccountType.creditCard;
    final value = isCard ? (a.balanceCents < 0 ? -a.balanceCents : 0) : a.balanceCents;
    final accent =
        a.color ?? AppColors.accountAccents[index % AppColors.accountAccents.length];
    final isPrimary = a.id == primaryId;

    return PressableScale(
      onTap: () => onOpen(a),
      scale: 0.96,
      borderRadius: BorderRadius.circular(AppRadius.md),
      splashColor: accent.withValues(alpha: 0.12),
      semanticLabel: '${a.name}, ${money(value)}',
      child: Container(
        width: _cardWidth,
        padding: EdgeInsets.all(space(4)),
        decoration: BoxDecoration(
          color: AppColors.surfaceLow,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: AppBorders.dark,
          boxShadow: AppShadows.soft,
        ),
        child: Row(
          children: [
            _iconTile(a.type, accent),
            SizedBox(width: space(3)),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.small(AppColors.onSurface)
                          .copyWith(fontWeight: FontWeight.w700)),
                  Text(money(value),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.amount(AppColors.white)),
                  if (isPrimary)
                    Text('CUENTA PRINCIPAL',
                        style: AppTextStyles.tiny(AppColors.turquoise)
                            .copyWith(fontSize: 10))
                  else if (isCard)
                    Text('CUPO USADO',
                        style: AppTextStyles.tiny(AppColors.coral)
                            .copyWith(fontSize: 10)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.mutedLight),
          ],
        ),
      ),
    );
  }

  Widget _iconTile(AccountType type, Color accent) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(width: 1, color: accent.withValues(alpha: 0.25)),
        ),
        child: Icon(_iconFor(type), size: 20, color: accent),
      );

  IconData _iconFor(AccountType t) => switch (t) {
        AccountType.bank => Icons.account_balance,
        AccountType.wallet => Icons.account_balance_wallet_outlined,
        AccountType.cash => Icons.payments_outlined,
        AccountType.creditCard => Icons.credit_card,
        AccountType.savings => Icons.savings_outlined,
        AccountType.other => Icons.account_balance_wallet_outlined,
      };

  Widget _emptyState() => Container(
        width: double.infinity,
        padding: EdgeInsets.all(space(5)),
        decoration: BoxDecoration(
          color: AppColors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: AppBorders.dark,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Aún no tienes cuentas registradas',
                textAlign: TextAlign.center,
                style: AppTextStyles.small(AppColors.white)
                    .copyWith(fontWeight: FontWeight.w700)),
            SizedBox(height: space(1)),
            Text('Agrega Nequi, Daviplata, Bancolombia o efectivo.',
                textAlign: TextAlign.center,
                style: AppTextStyles.tiny(AppColors.mutedLight)
                    .copyWith(fontWeight: FontWeight.w500)),
            SizedBox(height: space(3)),
            PressableScale(
              onTap: onCreate,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              semanticLabel: 'Agregar cuenta',
              child: Container(
                height: AppTouch.minTarget,
                padding: EdgeInsets.symmetric(horizontal: space(5)),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.turquoise,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text('Agregar cuenta',
                    style: AppTextStyles.small(AppColors.navy)
                        .copyWith(fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      );
}
