#!/usr/bin/env python3
"""Mechanical emoji → <Icon slot=.../> replacement in JSX.

Only replaces emojis that appear as direct JSX children or inside simple
`>{emoji}<` text nodes. Does NOT touch string literals (useState, toast args,
data constants) or JSX attribute values.
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.path.expanduser("~/Jobs/lifetycoon-kids"))

# slot mapping: emoji → slot id
EMOJI_MAP = {
    "💛": "stat-happiness",
    "❤️": "stat-health",
    "❤": "stat-health",
    "📘": "stat-wisdom",
    "📖": "stat-wisdom",
    "📚": "stat-wisdom",
    "🎓": "stat-wisdom",
    "✨": "stat-charisma",
    "💎": "asset-total",
    "💰": "asset-total",
    "💵": "asset-cash",
    "💸": "asset-cash",
    "💼": "cat-job",
    "👔": "cat-job",
    "🎒": "cat-job",
    "🏢": "cat-property",
    "🏘️": "cat-property",
    "🏨": "cat-property",
    "🏭": "cat-property",
    "📊": "nav-invest",
    "📈": "nav-invest",
    "📉": "eco-slump",
    "💹": "nav-invest",
    "📜": "cat-savings",
    "🧾": "cat-savings",
    "🏦": "nav-bank",
    "🏠": "nav-home",
    "🎮": "nav-home",
    "👥": "nav-friends",
    "👤": "nav-friends",
    "👶": "nav-friends",
    "📩": "nav-friends",
    "⚙️": "nav-settings",
    "⚠️": "status-alert",
    "🚨": "status-alert",
    "🛑": "status-alert",
    "⛔": "status-alert",
    "✅": "status-check",
    "🔥": "eco-boom",
    "🚀": "eco-boom",
    "🆙": "eco-boom",
    "🥶": "eco-slump",
    "⏬": "eco-slump",
    "👑": "rank-crown",
    "🏆": "rank-trophy",
    "🏅": "rank-medal",
    "🥇": "rank-medal",
    "🥈": "rank-medal",
    "🥉": "rank-medal",
    "🎖️": "rank-medal",
    "🌈": "feature-dream",
    "🎯": "feature-dream",
}

TARGETS = [
    ("src/ui/screens/TitleScreen.tsx", "../icons/Icon"),
    ("src/ui/screens/PlayScreen.tsx", "../icons/Icon"),
    ("src/ui/screens/EndingScreen.tsx", "../icons/Icon"),
    ("src/ui/screens/EventModal.tsx", "../icons/Icon"),
    ("src/ui/screens/DreamPickScreen.tsx", "../icons/Icon"),
    ("src/ui/screens/AchievementsModal.tsx", "../icons/Icon"),
    ("src/ui/screens/SkillModal.tsx", "../icons/Icon"),
    ("src/ui/screens/GlobalStatsModal.tsx", "../icons/Icon"),
    ("src/ui/screens/tabs/CashflowTab.tsx", "../../icons/Icon"),
    ("src/ui/screens/tabs/InvestTab.tsx", "../../icons/Icon"),
    ("src/ui/screens/tabs/BankTab.tsx", "../../icons/Icon"),
    ("src/ui/components/CashflowPanel.tsx", "../icons/Icon"),
    ("src/ui/components/NewsTicker.tsx", "../icons/Icon"),
    ("src/ui/components/MilestonePopup.tsx", "../icons/Icon"),
    ("src/ui/components/ReleaseNotesModal.tsx", "../icons/Icon"),
    ("src/ui/components/FeedbackModal.tsx", "../icons/Icon"),
    ("src/ui/components/StockDetailModal.tsx", "../icons/Icon"),
    ("src/ui/components/EventLogModal.tsx", "../icons/Icon"),
    ("src/ui/components/DebtBadge.tsx", "../icons/Icon"),
    ("src/ui/components/AssetChart.tsx", "../icons/Icon"),
    ("src/ui/components/StockQuizMiniGame.tsx", "../icons/Icon"),
    ("src/ui/components/UpdateBanner.tsx", "../icons/Icon"),
    ("src/ui/components/TutorialOverlay.tsx", "../icons/Icon"),
]

# Pattern: replace emoji that appears as direct JSX child between > and <
# Examples:
#   >👑<                                  -> ><Icon slot="rank-crown" />
#   >👑 {label}<                          -> ><Icon slot="rank-crown" /> {label}<
#   >{label} 👑<                          -> >{label} <Icon slot="rank-crown" /><
#   { someBool ? '🔊' : '🔇' }            -> NOT TOUCHED (string literal)
# Strategy: only replace inside JSX text nodes, so we scan for > ... < where
# the segment contains no quote char.

JSX_TEXT_RE = re.compile(r">(?P<body>[^<>{}'\"\\n]{0,200})<")


def replace_in_jsx_text(content: str) -> tuple[str, int]:
    """Replace emojis appearing bare in JSX text between > and <.

    Also handles cases like `>{expr} 💛<` where the emoji is between `}` and `<`.
    """
    count = 0

    def emoji_to_icon(m: re.Match) -> str:
        body = m.group("body")
        # Skip if no emoji in body
        new_body = body
        for emoji, slot in EMOJI_MAP.items():
            if emoji in new_body:
                new_body = new_body.replace(
                    emoji, f'<Icon slot="{slot}" size="md" />'
                )
        return ">" + new_body + "<"

    def count_replacements(m: re.Match) -> str:
        nonlocal count
        new_text = emoji_to_icon(m)
        if new_text != m.group(0):
            count += new_text.count("<Icon ") - m.group(0).count("<Icon ")
        return new_text

    content = JSX_TEXT_RE.sub(count_replacements, content)
    return content, count


def ensure_import(content: str, icon_path: str) -> str:
    if "from '../icons/Icon'" in content or 'from "../icons/Icon"' in content:
        return content
    if "from '../../icons/Icon'" in content or 'from "../../icons/Icon"' in content:
        return content
    import_line = f"import {{ Icon }} from '{icon_path}';\n"
    # Insert after last existing import
    lines = content.split("\n")
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import = i
    if last_import >= 0:
        lines.insert(last_import + 1, import_line.rstrip())
    else:
        lines.insert(0, import_line.rstrip())
    return "\n".join(lines)


def process(rel_path: str, icon_path: str) -> tuple[bool, int]:
    p = ROOT / rel_path
    if not p.exists():
        return False, 0
    original = p.read_text(encoding="utf-8")
    new_content, count = replace_in_jsx_text(original)
    if count == 0:
        return False, 0
    new_content = ensure_import(new_content, icon_path)
    p.write_text(new_content, encoding="utf-8")
    return True, count


def main() -> None:
    total = 0
    changed_files = 0
    for rel, ipath in TARGETS:
        changed, n = process(rel, ipath)
        status = "UPDATED" if changed else "skip"
        print(f"[{status:7}] {rel}: {n} replacements")
        if changed:
            changed_files += 1
            total += n
    print(f"\nTotal: {total} emojis replaced in {changed_files} files")


if __name__ == "__main__":
    main()
