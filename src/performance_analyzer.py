import logging

logger = logging.getLogger("performance_analyzer")


def summarize_student(doc: dict, student_id: str = None) -> str:
    """
    Analyze a single student's performance.
    
    Returns a human-readable summary with:
    - Average grade (G1, G2, G3)
    - Growth (G3 - G1)
    - At-risk flag (G3 < 10)
    - Study efficiency
    """
    sid = student_id or doc.get('_id', 'unknown')
    grades = [doc.get("G1"), doc.get("G2"), doc.get("G3")]
    
    # Filter out None values
    valid_grades = [g for g in grades if g is not None]
    if not valid_grades:
        return f"Student {sid} has no grade data."
    
    avg = sum(valid_grades) / len(valid_grades)
    growth = valid_grades[-1] - valid_grades[0] if len(valid_grades) >= 2 else 0
    status = "at-risk" if valid_grades[-1] < 10 else "okay"
    
    studytime = doc.get("studytime", 0)
    final_grade = valid_grades[-1]
    study_quality = "good" if studytime >= 2 and final_grade >= 12 else "needs improvement"
    
    result = (
        f"Student {sid} has grades {valid_grades}. "
        f"Average: {avg:.1f}, latest grade: {final_grade} ({status}). "
        f"Growth from first to final: {growth:+}. "
        f"Study efficiency: {study_quality} (studytime: {studytime}h, grade: {final_grade})."
    )
    return result


def detect_trend(doc: dict, student_id: str = None) -> str:
    """
    Detect student's grade trend: improving, declining, or stable.
    """
    sid = student_id or doc.get('_id', 'unknown')
    grades = [doc.get("G1"), doc.get("G2"), doc.get("G3")]
    valid_grades = [g for g in grades if g is not None]
    
    if len(valid_grades) < 2:
        return f"Student {sid} has insufficient grade data for trend analysis."
    
    trend = "stable"
    if valid_grades[-1] > valid_grades[0]:
        trend = "improving"
    elif valid_grades[-1] < valid_grades[0]:
        trend = "declining"
    
    # Also include a compact sparkline visualization
    spark = _grades_sparkline(valid_grades)
    arrow = "↑" if trend == "improving" else ("↓" if trend == "declining" else "→")
    return f"Student {sid} shows a {trend} trend {arrow}: {valid_grades} {spark}"


def derived_metrics(doc: dict, student_id: str = None) -> dict:
    """
    Extract derived risk indicators from student record.
    
    Returns dict with flags:
    - failure_alert: failures > 0 and studytime < 2
    - attendance_alert: absences > 10
    - behavior_alert: goout > 3 or daily/weekend alcohol > 3
    - at_risk: G3 < 10
    """
    sid = student_id or doc.get('_id', 'unknown')
    alerts = []
    
    failures = doc.get("failures", 0)
    studytime = doc.get("studytime", 0)
    if failures > 0 and studytime < 2:
        alerts.append(f"failure_alert: {failures} failures with low study time ({studytime}h)")
    
    absences = doc.get("absences", 0)
    if absences > 10:
        alerts.append(f"attendance_alert: {absences} absences")
    
    goout = doc.get("goout", 0)
    dalc = doc.get("Dalc", 0)
    walc = doc.get("Walc", 0)
    if goout > 3 or dalc > 3 or walc > 3:
        alerts.append(f"behavior_alert: goout={goout}, daily_alcohol={dalc}, weekend_alcohol={walc}")
    
    g3 = doc.get("G3", 0)
    if g3 < 10:
        alerts.append(f"at_risk: final grade {g3}")
    
    # Provide a risk level string
    if not alerts:
        risk = "low"
    elif any("at_risk" in a or "attendance_alert" in a for a in alerts):
        risk = "high"
    else:
        risk = "medium"

    return {
        "student_id": sid,
        "alerts": alerts,
        "has_alerts": len(alerts) > 0,
        "risk_level": risk
    }


def _grades_sparkline(grades: list) -> str:
    """Return a tiny sparkline for grade list using block characters."""
    if not grades:
        return ""
    blocks = "▁▂▃▄▅▆▇█"
    gmin, gmax = min(grades), max(grades)
    # avoid div by zero
    span = max(1, gmax - gmin)
    chars = []
    for g in grades:
        idx = int((g - gmin) / span * (len(blocks) - 1))
        chars.append(blocks[idx])
    return "".join(chars)


def class_analysis(students: list, top_n: int = 10, page: int = 1, grade_threshold: int | None = None, at_risk_only: bool = False) -> str:
    """
    Analyze a class/dataset: rank by G3, detect at-risk students.
    """
    if not students:
        return "No student data available."
    
    # Sort by G3 descending
    # Filter
    filtered = students
    if grade_threshold is not None:
        filtered = [s for s in filtered if s.get("G3", 0) >= grade_threshold]
    if at_risk_only:
        filtered = [s for s in filtered if s.get("G3", 0) < 10]

    sorted_students = sorted(filtered, key=lambda s: s.get("G3", 0), reverse=True)
    at_risk = [s for s in sorted_students if s.get("G3", 0) < 10]

    # Pagination
    start = (page - 1) * top_n
    end = start + top_n
    page_students = sorted_students[start:end]

    summary = f"Class ranking by final grade (G3) — page {page} (showing {len(page_students)}):\n"
    for i, s in enumerate(page_students, start + 1):
        sid = s.get("_id", "unknown")
        name = s.get("name") or sid
        g3 = s.get("G3", "N/A")
        summary += f"{i}. {name} ({sid}): {g3}\n"

    if end < len(sorted_students):
        summary += f"... and {len(sorted_students) - end} more students\n"

    if at_risk:
        summary += f"\nAt-risk students ({len(at_risk)}):\n"
        for s in at_risk[:50]:
            name = s.get("name") or s.get("_id", "unknown")
            g3 = s.get("G3", "N/A")
            summary += f"  - {name} ({s.get('_id', 'unknown')}): {g3}\n"
        if len(at_risk) > 50:
            summary += f"  ... and {len(at_risk) - 50} more at-risk students\n"
    else:
        summary += "\nNo at-risk students detected.\n"

    return summary


def class_summary_statistics(students: list) -> str:
    """
    Compute class-level statistics.
    """
    if not students:
        return "No student data available."
    
    grades = [s.get("G3", 0) for s in students if s.get("G3") is not None]
    if not grades:
        return "No grade data available."
    
    avg_grade = sum(grades) / len(grades)
    max_grade = max(grades)
    min_grade = min(grades)
    at_risk_count = len([g for g in grades if g < 10])
    
    summary = (
        f"Class statistics (n={len(students)}):\n"
        f"Average final grade: {avg_grade:.1f}\n"
        f"Highest: {max_grade}, Lowest: {min_grade}\n"
        f"At-risk students: {at_risk_count} ({100*at_risk_count/len(students):.1f}%)"
    )
    return summary
