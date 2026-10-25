import math
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import logging

from app.models.schemas import IntervalRecord, SummaryMetrics, DataQualitySummary
from app.services.forecast_selector import (
    ForecastSelector,
    format_utc_timestamp,
    parse_utc_timestamp,
)

logger = logging.getLogger(__name__)

class AccuracyEngine:
    def __init__(
        self,
        cutoff_time: str = "12:00:00",
        mapping_policy: str = "hourly_block"
    ):
        self.cutoff_time = cutoff_time
        self.mapping_policy = mapping_policy
        self.selector = ForecastSelector(cutoff_time=cutoff_time, mapping_policy=mapping_policy)

    def generate_settlement_intervals_for_date(self, delivery_date: date) -> List[Tuple[datetime, datetime, int]]:
        """
        Generates the 48 standard UK 30-minute settlement periods for a delivery date in UTC.
        Period 1: 00:00:00Z - 00:30:00Z
        Period 48: 23:30:00Z - 00:00:00Z (next day)
        """
        intervals = []
        base_dt = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 0, 0, 0, tzinfo=timezone.utc)
        for sp in range(1, 49):
            start = base_dt + timedelta(minutes=30 * (sp - 1))
            end = start + timedelta(minutes=30)
            intervals.append((start, end, sp))
        return intervals

    def run_analysis(
        self,
        decision_date_start: date,
        decision_date_end: date,
        raw_fuels: List[dict],
        raw_forecasts: List[dict],
        data_source_status: str = "live",
        retrieval_timestamp: Optional[str] = None
    ) -> Tuple[List[IntervalRecord], SummaryMetrics, DataQualitySummary, Dict[str, List[dict]]]:
        """
        Executes complete end-to-end matching, forecast selection, error calculation,
        and data quality aggregation for the given purchasing-decision date range.
        """
        # 1. Index actuals (FUELHH WIND) by targetStartTime ISO string
        actuals_by_start: Dict[str, dict] = {}
        duplicate_actuals = 0
        invalid_actuals = 0

        for r in raw_fuels:
            if r.get("fuelType") != "WIND":
                continue
            try:
                start_dt = parse_utc_timestamp(r["startTime"])
                gen = r.get("generation")
                if gen is None:
                    invalid_actuals += 1
                    continue
                gen_val = float(gen)
                if gen_val < 0:
                    invalid_actuals += 1
                    continue
            except Exception:
                invalid_actuals += 1
                continue

            start_iso = format_utc_timestamp(start_dt)
            if start_iso in actuals_by_start:
                duplicate_actuals += 1
                continue
            actuals_by_start[start_iso] = {
                "generation": gen_val,
                "settlementDate": r.get("settlementDate"),
                "settlementPeriod": r.get("settlementPeriod"),
            }

        # 2. Pre-index raw forecasts once for high-performance matching
        self.selector.index_raw_forecasts(raw_forecasts)

        # 3. Iterate each purchasing decision date
        all_records: List[IntervalRecord] = []
        all_vintages_by_target: Dict[str, List[dict]] = {}
        total_duplicates_handled = duplicate_actuals + self.selector._duplicate_forecast_count
        total_invalid_handled = invalid_actuals

        current_decision = decision_date_start
        while current_decision <= decision_date_end:
            delivery_date = current_decision + timedelta(days=1)
            target_intervals = self.generate_settlement_intervals_for_date(delivery_date)

            # Select forecasts for these delivery intervals
            selected_forecasts, vintages_map, dup_fc, rej_fc = (
                self.selector.select_forecasts_for_target_intervals(
                    decision_date=current_decision,
                    target_intervals=target_intervals,
                    raw_forecasts=raw_forecasts
                )
            )
            total_duplicates_handled += dup_fc
            all_vintages_by_target.update(vintages_map)

            # Match actuals and calculate errors
            for start_dt, end_dt, sp in target_intervals:
                t_start_iso = format_utc_timestamp(start_dt)
                t_end_iso = format_utc_timestamp(end_dt)
                settlement_date_str = delivery_date.isoformat()

                fc_info = selected_forecasts.get(t_start_iso, {})
                f_gen = fc_info.get("generation")
                f_pub = fc_info.get("publishTime")
                rationale = fc_info.get("rationale", "")

                act_info = actuals_by_start.get(t_start_iso)
                a_gen = act_info["generation"] if act_info else None

                # Status determination
                signed_error = None
                abs_error = None
                ape = None
                bias_contrib = None
                status = "matched"

                if a_gen is None and f_gen is None:
                    status = "missing_actual"
                    rationale = "Both actual generation and eligible forecast are missing"
                elif a_gen is None:
                    status = "missing_actual"
                    rationale = f"Actual wind generation missing from FUELHH. {rationale}"
                elif f_gen is None:
                    status = "missing_forecast"
                else:
                    # Both present: compute accuracy metrics
                    signed_error = round(a_gen - f_gen, 2)
                    abs_error = round(abs(a_gen - f_gen), 2)
                    bias_contrib = round(f_gen - a_gen, 2)
                    if a_gen > 0:
                        ape = round(100.0 * abs_error / a_gen, 3)

                rec = IntervalRecord(
                    decisionDate=current_decision.isoformat(),
                    targetStartTime=t_start_iso,
                    targetEndTime=t_end_iso,
                    settlementDate=settlement_date_str,
                    settlementPeriod=sp,
                    forecastPublishTime=f_pub,
                    forecastGeneration=round(f_gen, 2) if f_gen is not None else None,
                    actualGeneration=round(a_gen, 2) if a_gen is not None else None,
                    signedError=signed_error,
                    absoluteError=abs_error,
                    absolutePercentageError=ape,
                    biasContribution=bias_contrib,
                    matchStatus=status,
                    selectionRationale=rationale
                )
                all_records.append(rec)

            current_decision += timedelta(days=1)

        # 3. Aggregate summary metrics across matched intervals
        total_target_intervals = len(all_records)
        matched_records = [r for r in all_records if r.matchStatus == "matched"]
        matched_count = len(matched_records)
        missing_forecast_count = sum(1 for r in all_records if r.matchStatus == "missing_forecast")
        missing_actual_count = sum(1 for r in all_records if r.matchStatus == "missing_actual")

        match_rate = round(100.0 * matched_count / total_target_intervals, 2) if total_target_intervals > 0 else 0.0

        mae = None
        mape = None
        bias = None
        rmse = None
        mean_actual = None
        mean_forecast = None
        zero_actual_exclusions = 0

        if matched_count > 0:
            abs_errors = [r.absoluteError for r in matched_records if r.absoluteError is not None]
            signed_errors = [r.signedError for r in matched_records if r.signedError is not None]
            bias_contribs = [r.biasContribution for r in matched_records if r.biasContribution is not None]
            actual_gens = [r.actualGeneration for r in matched_records if r.actualGeneration is not None]
            fc_gens = [r.forecastGeneration for r in matched_records if r.forecastGeneration is not None]

            mae = round(sum(abs_errors) / matched_count, 2)
            bias = round(sum(bias_contribs) / matched_count, 2)
            rmse = round(math.sqrt(sum(e * e for e in signed_errors) / matched_count), 2)
            mean_actual = round(sum(actual_gens) / len(actual_gens), 2) if actual_gens else None
            mean_forecast = round(sum(fc_gens) / len(fc_gens), 2) if fc_gens else None

            # MAPE calculation: strictly exclude zero actuals
            valid_apes = [r.absolutePercentageError for r in matched_records if r.absolutePercentageError is not None]
            zero_actual_exclusions = sum(1 for r in matched_records if r.actualGeneration == 0.0)
            if valid_apes:
                mape = round(sum(valid_apes) / len(valid_apes), 2)

        summary_metrics = SummaryMetrics(
            totalTargetIntervals=total_target_intervals,
            matchedIntervals=matched_count,
            missingForecastIntervals=missing_forecast_count,
            missingActualIntervals=missing_actual_count,
            matchRatePercent=match_rate,
            mae=mae,
            mape=mape,
            zeroActualExclusions=zero_actual_exclusions,
            bias=bias,
            rmse=rmse,
            meanActualGeneration=mean_actual,
            meanForecastGeneration=mean_forecast,
            unit="MW"
        )

        # 4. Data Quality Summary
        denominator_desc = (
            f"Total evaluated half-hour delivery intervals ({total_target_intervals} across "
            f"{(decision_date_end - decision_date_start).days + 1} decision days x 48 settlement periods)"
        )

        data_quality = DataQualitySummary(
            actualRecordsRetrieved=len(raw_fuels),
            forecastRecordsRetrieved=len(raw_forecasts),
            matchedIntervals=matched_count,
            missingActualObservations=missing_actual_count,
            intervalsWithoutEligibleForecasts=missing_forecast_count,
            duplicateRecordsHandled=total_duplicates_handled,
            invalidRecordsHandled=total_invalid_handled,
            matchRate=match_rate,
            denominator=denominator_desc,
            dataRetrievalStatus=data_source_status,
            retrievalTimestamp=retrieval_timestamp or datetime.now(timezone.utc).isoformat(),
            cutoffTimeUtc=self.cutoff_time,
            mappingPolicy=self.mapping_policy
        )

        return all_records, summary_metrics, data_quality, all_vintages_by_target
