"""Farmer reliability scoring — see Farmer.reliability_score."""
from datetime import timedelta

from django.utils import timezone

from farmers.models import Harvest

GRADE_POINTS = {
    Harvest.Grade.A: 100,
    Harvest.Grade.B: 66,
    Harvest.Grade.C: 33,
}


def recalculate_reliability_score(farmer):
    """
    Recomputes and saves farmer.reliability_score from the trailing 12
    months of their harvests: 60% delivery consistency (collected vs
    rejected, ignoring still-pending ones) + 40% average grade quality.
    Weights are a business judgment call, not derived from the data.
    """
    since = timezone.now().date() - timedelta(days=365)
    recent = farmer.harvests.filter(harvest_date__gte=since)

    collected = recent.filter(status=Harvest.Status.COLLECTED)
    rejected = recent.filter(status=Harvest.Status.REJECTED)
    decided_count = collected.count() + rejected.count()

    if decided_count == 0:
        farmer.reliability_score = 0
        farmer.save(update_fields=["reliability_score"])
        return

    consistency = collected.count() / decided_count

    graded_points = [GRADE_POINTS[h.grade] for h in collected if h.grade in GRADE_POINTS]
    avg_grade = sum(graded_points) / len(graded_points) if graded_points else 0

    farmer.reliability_score = round(0.6 * consistency * 100 + 0.4 * avg_grade, 1)
    farmer.save(update_fields=["reliability_score"])
