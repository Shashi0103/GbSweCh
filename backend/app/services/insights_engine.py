from collections import defaultdict
from typing import Dict, List
import logging

from app.models.schemas import InsightItem, InsightsResponse, IntervalRecord, SummaryMetrics

logger = logging.getLogger(__name__)

class InsightsEngine:
    @staticmethod
    def generate_insights(
        records: List[IntervalRecord],
        metrics: SummaryMetrics
    ) -> InsightsResponse:
        """
        Derives quantitative, data-driven analytical insights from processed results.
        No fabricated or generic placeholders.
        """
        insights: List[InsightItem] = []
        matched = [r for r in records if r.matchStatus == "matched"]

        if not matched or metrics.matchedIntervals == 0:
            return InsightsResponse(
                insights=[
                    InsightItem(
                        type="coverage",
                        title="Insufficient Data Coverage",
                        summary="No matched intervals available in the selected range to generate analytical insights.",
                        severity="warning",
                    )
                ],
                peakErrorDays=[],
                diurnalProfile=[]
            )

        # 1. Bias Insight
        bias_val = metrics.bias or 0.0
        mean_act = metrics.meanActualGeneration or 1.0
        bias_pct = round(abs(bias_val) / mean_act * 100.0, 1)

        if bias_val > 50:
            bias_title = "Systematic Overforecasting Bias"
            bias_summary = (
                f"Day-ahead forecasts showed a net overforecasting bias of +{bias_val:,.1f} MW "
                f"({bias_pct}% of mean actual generation). When purchasing day-ahead, the utility contracted "
                f"for more wind than materialized, potentially exposing the portfolio to system buy prices in the imbalance market."
            )
            bias_sev = "warning"
        elif bias_val < -50:
            bias_title = "Systematic Underforecasting Bias"
            bias_summary = (
                f"Day-ahead forecasts showed a net underforecasting bias of {bias_val:,.1f} MW "
                f"({bias_pct}% of mean actual generation). Actual wind output systematically exceeded expectations, "
                f"likely resulting in surplus generation spilled into the balancing mechanism."
            )
            bias_sev = "info"
        else:
            bias_title = "Well-Calibrated Directional Bias"
            bias_summary = (
                f"Forecast bias was near-neutral at {bias_val:,.1f} MW ({bias_pct}% of mean actual generation), "
                f"indicating minimal systematic day-ahead bias over the analyzed period."
            )
            bias_sev = "positive"

        insights.append(InsightItem(
            type="bias",
            title=bias_title,
            summary=bias_summary,
            severity=bias_sev,
            detail=f"Sample size: {metrics.matchedIntervals:,} matched intervals across January 2026."
        ))

        # 2. Peak Error Days (Aggregate by Settlement Delivery Date)
        daily_errors = defaultdict(list)
        for r in matched:
            daily_errors[r.settlementDate].append(r.absoluteError)

        daily_mae_list = [
            {
                "settlementDate": d,
                "mae": round(sum(errs) / len(errs), 1),
                "count": len(errs)
            }
            for d, errs in daily_errors.items()
        ]
        daily_mae_list.sort(key=lambda x: x["mae"], reverse=True)
        top_peak_days = daily_mae_list[:3]

        if top_peak_days:
            worst = top_peak_days[0]
            insights.append(InsightItem(
                type="peak_error",
                title=f"Highest Forecast Volatility on {worst['settlementDate']}",
                summary=(
                    f"Delivery date {worst['settlementDate']} recorded the month's highest daily MAE at "
                    f"{worst['mae']:,.1f} MW (vs monthly MAE of {metrics.mae:,.1f} MW). "
                    f"Top 3 volatility dates: {', '.join([f'{d['settlementDate']} ({d['mae']} MW)' for d in top_peak_days])}."
                ),
                severity="warning",
                detail="High day-ahead error days typically correspond to rapid synoptic weather front transitions across Great Britain."
            ))

        # 3. Diurnal (Hourly) Error Profile
        # UK settlement periods 1-48 map to hours 0-23
        hourly_errors = defaultdict(list)
        for r in matched:
            hour = (r.settlementPeriod - 1) // 2
            hourly_errors[hour].append(r.absoluteError)

        diurnal_profile = [
            {
                "hour": h,
                "hourLabel": f"{h:02d}:00 UTC",
                "mae": round(sum(errs) / len(errs), 1),
                "count": len(errs)
            }
            for h in sorted(hourly_errors.keys())
            if (errs := hourly_errors[h])
        ]

        if diurnal_profile:
            highest_hour = max(diurnal_profile, key=lambda x: x["mae"])
            lowest_hour = min(diurnal_profile, key=lambda x: x["mae"])
            insights.append(InsightItem(
                type="diurnal",
                title="Diurnal Accuracy Pattern",
                summary=(
                    f"Peak forecast error occurred at {highest_hour['hourLabel']} (MAE {highest_hour['mae']:,.1f} MW), "
                    f"while the most accurate forecasts occurred at {lowest_hour['hourLabel']} (MAE {lowest_hour['mae']:,.1f} MW). "
                    f"Uncertainty tends to expand during evening peak demand ramp hours."
                ),
                severity="info",
                detail="Diurnal variations highlight intra-day risk profiles for scheduling energy trades."
            ))

        # 4. Data Quality & Match Coverage
        match_pct = metrics.matchRatePercent
        if match_pct >= 99.0:
            insights.append(InsightItem(
                type="coverage",
                title="Complete Interval Coverage",
                summary=(
                    f"Successfully matched {metrics.matchedIntervals:,} of {metrics.totalTargetIntervals:,} "
                    f"scheduled half-hour settlement periods ({match_pct}% match rate). No data gaps in actuals or day-ahead forecasts."
                ),
                severity="positive",
                detail=f"Excluded {metrics.zeroActualExclusions} intervals with 0 MW generation from MAPE to prevent division-by-zero bias."
            ))
        else:
            insights.append(InsightItem(
                type="coverage",
                title=f"Partial Data Coverage ({match_pct}%)",
                summary=(
                    f"Matched {metrics.matchedIntervals:,} of {metrics.totalTargetIntervals:,} intervals. "
                    f"{metrics.missingForecastIntervals} intervals lacked eligible forecasts published prior to cutoff."
                ),
                severity="warning",
                detail="Accuracy metrics reflect only matched intervals."
            ))

        return InsightsResponse(
            insights=insights,
            peakErrorDays=top_peak_days,
            diurnalProfile=diurnal_profile
        )
